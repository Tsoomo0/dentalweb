import {
    AvatarRing, Bar, Empty, GLASS, GLASS_CTA, HeroShell, HeroStat, HeroStatGrid,
    LabCommentItem, ReachBar, Tag, progressTone,
} from '@/components/lab-admin-ui';
import { TONE } from '@/components/lab-training-ui';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle, ArrowDown, ArrowUp, BarChart3, CheckCircle2, Clock, GraduationCap,
    Heart, MessageSquare, Search, Trophy, Users, Video, Youtube,
} from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';

/**
 * Админ тал — сургалтын нэгдсэн тайлан.
 *
 * ДҮРСЛЭЛИЙН БОДОЛ: гурван өөр асуултыг нэг хуудсанд хариулна — "аль хичээл
 * ажиллаж байна", "хэн хоцорч байна", "юу яриад байна". Тиймээс таб бүр
 * өөрийн хайлт, эрэмбэтэй бие даасан хүснэгт. Ажилтны таб нь эрэмбээрээ
 * тэргүүлэгчийн самбар шиг ажилладаг.
 */

interface LessonRow {
    id: number;
    title: string;
    course_title: string | null;
    is_published: boolean;
    duration_label: string;
    poster_url: string | null;
    video_provider: 'local' | 'youtube' | 'r2';
    viewers_count: number;
    completed_count: number;
    comments_count: number;
    reactions_count: number;
    avg_progress: number;
    watch_hours: number;
    /** Энэ хичээлийг үзэх ёстой ажилтны тоо (сургалтын албан тушаалаас). */
    audience: number;
    reach_percent: number;
    is_required: boolean;
    due_at: string | null;
    overdue_count: number;
}

interface EmployeeRow {
    id: number;
    name: string;
    position: string | null;
    started: number;
    completed: number;
    total_lessons: number;
    percent: number;
    watch_hours: number;
    last_viewed_at: string | null;
    overdue: number;
    exams_taken: number;
    exams_passed: number;
    avg_exam_score: number | null;
}

interface CommentRow {
    id: number;
    body: string;
    user_name: string;
    lesson_id: number;
    lesson_title: string | null;
    is_reply: boolean;
    is_pinned: boolean;
    is_hidden: boolean;
    reactions_count: number;
    created_at: string | null;
}

interface Props {
    audience: number;
    totals: {
        lessons: number;
        published: number;
        viewers: number;
        watch_hours: number;
        comments: number;
        reactions: number;
        overdue: number;
    };
    lessons: LessonRow[];
    employees: EmployeeRow[];
    comments: CommentRow[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Видео хичээл', href: '/admin/lab-training' },
    { title: 'Тайлан', href: '/admin/lab-training/report' },
];

type Tab = 'lessons' | 'employees' | 'comments';

/** Хичээлийн хүснэгтийн багана — толгой ба мөр ижил grid ашиглана. */
const LESSON_ROW = cn(
    'grid items-center gap-x-3 px-3 sm:px-4',
    'grid-cols-[56px_minmax(0,1fr)_120px]',
    'sm:grid-cols-[56px_minmax(0,1fr)_86px_120px]',
    'lg:grid-cols-[56px_minmax(0,1fr)_86px_72px_120px_60px]',
    'xl:grid-cols-[56px_minmax(0,1fr)_86px_72px_120px_60px_64px_64px_110px]',
);

/** Ажилтны хүснэгтийн багана. */
const STAFF_ROW = cn(
    'grid items-center gap-x-3 px-3 sm:px-4',
    'grid-cols-[28px_minmax(0,1fr)_140px]',
    'sm:grid-cols-[28px_minmax(0,1fr)_140px_72px]',
    'lg:grid-cols-[28px_minmax(0,1fr)_140px_72px_60px_72px]',
    'xl:grid-cols-[28px_minmax(0,1fr)_140px_72px_60px_72px_72px_64px_116px]',
);

const HEAD = 'h-9 border-b bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground';

export default function LabTrainingReport({ audience, totals, lessons, employees, comments }: Props) {
    const [tab, setTab] = useState<Tab>('lessons');

    const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

    const done       = employees.filter((e) => e.total_lessons > 0 && e.percent >= 100).length;
    const started    = employees.filter((e) => e.started > 0).length;
    const notSeen    = Math.max(0, audience - started);
    const inProgress = Math.max(0, started - done);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Сургалтын тайлан" />

            {/* ── Кино маягийн толгой ────────────────────────────────────── */}
            <HeroShell>
                <div className="px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/90">
                                <BarChart3 className="size-3" />
                                Лабораторийн сургалт
                            </p>

                            <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-[28px]">
                                Сургалтын тайлан
                            </h1>

                            <p className="mt-1 max-w-lg text-xs text-white/55">
                                Хичээл, ажилтан, сэтгэгдлийн нэгдсэн дүр зураг.
                            </p>

                            {/* Ажилтнуудын нэгдсэн байдал — нэг зурваст гурван бүлэг */}
                            <ReachBar
                                total={audience}
                                segments={[
                                    { bar: 'bg-emerald-400', label: 'Бүрэн дуусгасан', value: done },
                                    { bar: 'bg-violet-400', label: 'Явцтай', value: inProgress },
                                    { bar: 'bg-white/25', label: 'Огт эхлээгүй', value: notSeen, track: true },
                                ]}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <Link href="/admin/lab-training/exams" className={GLASS}>
                                <GraduationCap className="size-3.5" />
                                Шалгалт
                            </Link>
                            <Link href="/admin/lab-training" className={GLASS_CTA}>
                                <Video className="size-3.5" />
                                Хичээл рүү
                            </Link>
                        </div>
                    </div>

                    <HeroStatGrid className="mt-5 xl:grid-cols-6">
                        <HeroStat
                            tone="indigo" icon={Video} label="Хичээл"
                            value={totals.lessons} hint={`${totals.published} нийтэлсэн`}
                            percent={share(totals.published, totals.lessons)}
                        />
                        <HeroStat
                            tone="violet" icon={Users} label="Үзсэн ажилтан"
                            value={`${totals.viewers}/${audience}`} hint={`${share(totals.viewers, audience)}%`}
                            percent={share(totals.viewers, audience)}
                        />
                        <HeroStat
                            tone="sky" icon={Clock} label="Нийт үзэлт"
                            value={`${totals.watch_hours} ц`} hint="хуримтлагдсан"
                        />
                        <HeroStat
                            tone="emerald" icon={MessageSquare} label="Сэтгэгдэл"
                            value={totals.comments} hint={`${comments.length} сүүлийн`}
                        />
                        <HeroStat
                            tone="amber" icon={Heart} label="Reaction"
                            value={totals.reactions}
                        />
                        <HeroStat
                            tone={totals.overdue > 0 ? 'rose' : 'slate'} icon={AlertTriangle}
                            label="Хугацаа хэтэрсэн" value={totals.overdue}
                            hint={totals.overdue > 0 ? 'анхаарал шаардлагатай' : 'хоцролтгүй'}
                        />
                    </HeroStatGrid>
                </div>
            </HeroShell>

            <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
                {totals.overdue > 0 && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                            Заавал үзэх хичээлийн хугацаа хэтэрсэн <strong className="font-bold">{totals.overdue}</strong> тохиолдол байна.
                        </span>
                        <button
                            onClick={() => setTab('employees')}
                            className="shrink-0 font-semibold underline underline-offset-2"
                        >
                            Хэн бэ?
                        </button>
                    </div>
                )}

                {/* ── Табууд ─────────────────────────────────────────────── */}
                <div className="inline-flex h-9 self-start rounded-xl border bg-muted/40 p-0.5">
                    {([
                        ['lessons', 'Хичээлээр', lessons.length],
                        ['employees', 'Ажилтнаар', employees.length],
                        ['comments', 'Сэтгэгдэл', comments.length],
                    ] as [Tab, string, number][]).map(([key, label, count]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-[10px] px-3 text-xs font-medium transition',
                                tab === key
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {label}
                            <span className="tabular-nums opacity-50">{count}</span>
                        </button>
                    ))}
                </div>

                {tab === 'lessons' && <LessonTable lessons={lessons} />}
                {tab === 'employees' && <StaffTable employees={employees} audience={audience} />}
                {tab === 'comments' && <CommentList comments={comments} />}
            </div>
        </AppLayout>
    );
}

/* ── Эрэмбэлэх толгой ──────────────────────────────────────────────────── */
/**
 * Дарахад тухайн баганаар эрэмбэлнэ, дахин дарахад эсрэгээр эргэнэ.
 * Идэвхтэй багана л сум харуулна — толгой мөр цэвэрхэн хэвээр үлдэнэ.
 */
function SortHead({ label, active, dir, onClick, align = 'right' }: {
    label: string;
    active: boolean;
    dir: 'asc' | 'desc';
    onClick: () => void;
    align?: 'left' | 'right';
}) {
    const Arrow = dir === 'asc' ? ArrowUp : ArrowDown;

    const arrow = (
        <Arrow className={cn(
            'size-3 shrink-0 transition-opacity',
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
        )} />
    );

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'group flex w-full min-w-0 items-center gap-1 uppercase transition-colors hover:text-foreground',
                align === 'right' ? 'justify-end' : 'justify-start',
                active && 'text-foreground',
            )}
        >
            {align === 'right' && arrow}
            <span className="truncate">{label}</span>
            {align === 'left' && arrow}
        </button>
    );
}

/** Эрэмбийн төлөв — багана солиход шинэ багана бууралтаар эхэлнэ. */
function useSort<K extends string>(initial: K) {
    const [key, setKey] = useState<K>(initial);
    const [dir, setDir] = useState<'asc' | 'desc'>('desc');

    return {
        key,
        dir,
        toggle: (next: K) => {
            if (next === key) {
                setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
            } else {
                setKey(next);
                setDir('desc');
            }
        },
    };
}

/** Тоо эсвэл текстийг эрэмбийн чиглэлийн дагуу харьцуулна. */
function compare(x: number | string, y: number | string, dir: 'asc' | 'desc'): number {
    const sign = dir === 'desc' ? -1 : 1;

    if (typeof x === 'string' || typeof y === 'string') {
        return sign * String(x).localeCompare(String(y));
    }

    return sign * (x - y);
}

/* ── Хүснэгтийн нийтлэг хэсгүүд ────────────────────────────────────────── */

/** Хайлтын талбар — бүх хүснэгтийн толгойд ижил. */
function TableSearch({ value, onChange, placeholder }: {
    value: string; onChange: (v: string) => void; placeholder: string;
}) {
    return (
        <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-8 w-full rounded-lg border bg-background pl-8 pr-3 text-xs outline-none transition placeholder:text-muted-foreground/60 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
            />
        </div>
    );
}

/** Хүснэгтийн толгойн зурвас — гарчиг, тоо, шүүлт. */
function TableHead({ icon: Icon, title, count, children }: {
    icon: typeof Video; title: string; count: number; children?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-4">
            <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight">
                <Icon className="size-4 text-muted-foreground" />
                {title}
            </h2>
            <span className="rounded-full bg-muted px-2 text-[11px] font-semibold leading-5 tabular-nums text-muted-foreground">
                {count}
            </span>
            {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
        </div>
    );
}

/** Тэг утга бүдгэрдэг тоон нүд. */
function Num({ value, className }: { value: number; className?: string }) {
    return (
        <span className={cn(
            'text-right text-xs tabular-nums',
            value === 0 && 'text-muted-foreground/50',
            className,
        )}>
            {value}
        </span>
    );
}

/* ── Хичээлийн хүснэгт ─────────────────────────────────────────────────── */
type LessonKey = 'title' | 'reach' | 'completed' | 'progress' | 'watch' | 'comments' | 'reactions';

function LessonTable({ lessons }: { lessons: LessonRow[] }) {
    const [query, setQuery] = useState('');
    const sort = useSort<LessonKey>('reach');

    const rows = useMemo(() => {
        const term = query.trim().toLowerCase();

        const value = (l: LessonRow): number | string => {
            switch (sort.key) {
                case 'title': return l.title.toLowerCase();
                case 'reach': return l.reach_percent;
                case 'completed': return l.completed_count;
                case 'progress': return l.avg_progress;
                case 'watch': return l.watch_hours;
                case 'comments': return l.comments_count;
                case 'reactions': return l.reactions_count;
            }
        };

        return lessons
            .filter((l) => !term
                || l.title.toLowerCase().includes(term)
                || (l.course_title ?? '').toLowerCase().includes(term))
            .sort((a, b) => compare(value(a), value(b), sort.dir));
    }, [lessons, query, sort.key, sort.dir]);

    const head = (key: LessonKey, label: string, align: 'left' | 'right' = 'right') => (
        <SortHead
            label={label}
            align={align}
            active={sort.key === key}
            dir={sort.dir}
            onClick={() => sort.toggle(key)}
        />
    );

    return (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <TableHead icon={Video} title="Хичээлээр" count={lessons.length}>
                <TableSearch value={query} onChange={setQuery} placeholder="Хичээл, сургалт хайх" />
            </TableHead>

            <div className={cn(LESSON_ROW, HEAD)}>
                <span />
                {head('title', 'Хичээл', 'left')}
                <span className="hidden sm:block">{head('reach', 'Хамралт')}</span>
                <span className="hidden lg:block">{head('completed', 'Дуусгасан')}</span>
                {head('progress', 'Дундаж явц')}
                <span className="hidden lg:block">{head('watch', 'Үзэлт')}</span>
                <span className="hidden xl:block">{head('comments', 'Сэтгэгдэл')}</span>
                <span className="hidden xl:block">{head('reactions', 'Reaction')}</span>
                <span className="hidden text-right xl:block">Хугацаа</span>
            </div>

            {rows.length === 0 ? (
                <Empty
                    title={query ? 'Илэрц олдсонгүй' : 'Хичээл байхгүй байна'}
                    text={query ? 'Хайлтын үгээ өөрчилж үзнэ үү.' : 'Эхлээд сургалт дотроо видео хичээл нэмнэ үү.'}
                />
            ) : (
                rows.map((l) => <LessonRowView key={l.id} lesson={l} />)
            )}
        </section>
    );
}

function LessonRowView({ lesson: l }: { lesson: LessonRow }) {
    const t = progressTone(l.avg_progress);

    return (
        <div className={cn(LESSON_ROW, 'h-14 border-t transition-colors hover:bg-muted/40')}>
            {/* Постер — кино сангийн хуудастай нэг хэл */}
            <Link
                href={`/admin/lab-training/report/lessons/${l.id}`}
                className="relative h-8 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-950 ring-1 ring-black/5 dark:ring-white/10"
                title={l.title}
            >
                {l.poster_url ? (
                    <img src={l.poster_url} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                    <span className="grid size-full place-items-center">
                        {l.video_provider === 'youtube'
                            ? <Youtube className="size-3.5 text-white/35" />
                            : <Video className="size-3.5 text-white/20" />}
                    </span>
                )}

                {l.avg_progress > 0 && (
                    <span className="absolute inset-x-0 bottom-0 h-[2px] bg-white/20">
                        <span
                            className={cn('block h-full', TONE[t].bar)}
                            style={{ width: `${Math.min(100, l.avg_progress)}%` }}
                        />
                    </span>
                )}
            </Link>

            <span className="min-w-0">
                <Link
                    href={`/admin/lab-training/report/lessons/${l.id}`}
                    className="flex items-center gap-1.5"
                >
                    <span className="truncate text-[13px] font-medium transition-colors hover:text-violet-600 dark:hover:text-violet-400">
                        {l.title}
                    </span>
                    {!l.is_published && <Tag tone="amber">Ноорог</Tag>}
                    {l.is_required && <Tag tone={l.overdue_count > 0 ? 'rose' : 'violet'}>Заавал</Tag>}
                </Link>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {l.course_title}
                    {l.duration_label !== '—' && ` · ${l.duration_label}`}
                </span>
            </span>

            {/* Хамрах хүрээ нь хичээл бүрд өөр (сургалтын албан тушаалаас) тул
                хувийн хажууд хуваарийг нь бас харуулна. */}
            <span
                className="hidden text-right text-xs tabular-nums sm:block"
                title={`${l.viewers_count} / ${l.audience} ажилтан үзсэн`}
            >
                {l.viewers_count}
                <span className="text-muted-foreground/60">/{l.audience}</span>
                <span className="ml-1 text-[11px] text-muted-foreground">({l.reach_percent}%)</span>
            </span>

            <span className={cn(
                'hidden text-right text-xs tabular-nums lg:block',
                l.completed_count > 0
                    ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground/50',
            )}>
                {l.completed_count}
            </span>

            <Bar percent={l.avg_progress} />

            <span className="hidden text-right text-xs tabular-nums text-muted-foreground lg:block">
                {l.watch_hours} ц
            </span>
            <Num value={l.comments_count} className="hidden xl:block" />
            <Num value={l.reactions_count} className="hidden xl:block" />

            <span className="hidden justify-end xl:flex">
                {!l.is_required ? (
                    <span className="text-[11px] text-muted-foreground/50">—</span>
                ) : l.overdue_count > 0 ? (
                    <Tag tone="rose">{l.overdue_count} хоцорсон</Tag>
                ) : (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                        {l.due_at ?? 'Хугацаагүй'}
                    </span>
                )}
            </span>
        </div>
    );
}

/* ── Ажилтны хүснэгт ───────────────────────────────────────────────────── */
type StaffKey = 'name' | 'percent' | 'completed' | 'watch' | 'overdue' | 'exams' | 'score' | 'last';

function StaffTable({ employees, audience }: { employees: EmployeeRow[]; audience: number }) {
    const [query, setQuery] = useState('');
    const sort = useSort<StaffKey>('percent');

    const rows = useMemo(() => {
        const term = query.trim().toLowerCase();

        const value = (e: EmployeeRow): number | string => {
            switch (sort.key) {
                case 'name': return e.name.toLowerCase();
                case 'percent': return e.percent;
                case 'completed': return e.completed;
                case 'watch': return e.watch_hours;
                case 'overdue': return e.overdue;
                case 'exams': return e.exams_passed;
                case 'score': return e.avg_exam_score ?? -1;
                case 'last': return e.last_viewed_at ?? '';
            }
        };

        return employees
            .filter((e) => !term || e.name.toLowerCase().includes(term))
            .sort((a, b) => compare(value(a), value(b), sort.dir));
    }, [employees, query, sort.key, sort.dir]);

    // Шагналын өнгө нь зөвхөн гүйцэтгэлээр буурч эрэмбэлсэн үед утгатай
    const ranked = sort.key === 'percent' && sort.dir === 'desc';

    const head = (key: StaffKey, label: string, align: 'left' | 'right' = 'right') => (
        <SortHead
            label={label}
            align={align}
            active={sort.key === key}
            dir={sort.dir}
            onClick={() => sort.toggle(key)}
        />
    );

    return (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <TableHead icon={Users} title="Ажилтнаар" count={employees.length}>
                <span className="hidden text-[11px] text-muted-foreground sm:block">
                    Хамрах хүрээ {audience}
                </span>
                <TableSearch value={query} onChange={setQuery} placeholder="Ажилтан хайх" />
            </TableHead>

            <div className={cn(STAFF_ROW, HEAD)}>
                <span className="text-center">#</span>
                {head('name', 'Ажилтан', 'left')}
                {head('percent', 'Гүйцэтгэл')}
                <span className="hidden sm:block">{head('completed', 'Дуусгасан')}</span>
                <span className="hidden lg:block">{head('watch', 'Үзэлт')}</span>
                <span className="hidden lg:block">{head('overdue', 'Хоцорсон')}</span>
                <span className="hidden xl:block">{head('exams', 'Шалгалт')}</span>
                <span className="hidden xl:block">{head('score', 'Оноо')}</span>
                <span className="hidden xl:block">{head('last', 'Сүүлд')}</span>
            </div>

            {rows.length === 0 ? (
                <Empty
                    title={query ? 'Илэрц олдсонгүй' : 'Ажилтан бүртгэгдээгүй байна'}
                    text={query ? 'Хайлтын үгээ өөрчилж үзнэ үү.' : undefined}
                />
            ) : (
                rows.map((e, i) => <StaffRowView key={e.id} employee={e} rank={i + 1} ranked={ranked} />)
            )}
        </section>
    );
}

/** Эхний гурван байрны өнгө — алт, мөнгө, хүрэл. */
const MEDAL: Record<number, string> = {
    1: 'bg-amber-400/20 text-amber-600 ring-amber-400/40 dark:text-amber-300',
    2: 'bg-slate-400/20 text-slate-600 ring-slate-400/40 dark:text-slate-300',
    3: 'bg-orange-500/15 text-orange-600 ring-orange-500/35 dark:text-orange-300',
};

function StaffRowView({ employee: e, rank, ranked }: {
    employee: EmployeeRow; rank: number; ranked: boolean;
}) {
    const medal = ranked && rank <= 3 ? MEDAL[rank] : null;
    const idle  = e.started === 0;

    return (
        // Мөр бүтнээрээ холбоос — админ нэр дээр нь дарж хувийн хэрэг рүү орно
        <Link
            href={`/admin/lab-training/report/employees/${e.id}`}
            className={cn(
                STAFF_ROW,
                'h-14 border-t transition-colors hover:bg-muted/40',
                idle && 'bg-rose-500/[0.03] dark:bg-rose-500/[0.04]',
            )}
        >
            {/* Байр — эхний гурав нь шагналын өнгөтэй */}
            <span className={cn(
                'grid size-6 place-items-center rounded-md text-[11px] font-bold tabular-nums',
                medal ? cn(medal, 'ring-1') : 'text-muted-foreground/50',
            )}>
                {rank === 1 && medal ? <Trophy className="size-3" /> : rank}
            </span>

            <span className="flex min-w-0 items-center gap-2.5">
                <AvatarRing name={e.name} percent={e.percent} idle={idle} />

                <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                        <span className={cn('truncate text-[13px] font-medium', idle && 'text-muted-foreground')}>
                            {e.name}
                        </span>
                        {e.percent >= 100 && e.total_lessons > 0 && (
                            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        )}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {[e.position, idle ? 'Огт эхлээгүй' : `${e.started} хичээл эхлүүлсэн`]
                            .filter(Boolean).join(' · ')}
                    </span>
                </span>
            </span>

            <Bar percent={e.percent} />

            <span className="hidden text-right text-xs tabular-nums sm:block">
                {e.completed}
                <span className="text-muted-foreground/60">/{e.total_lessons}</span>
            </span>

            <span className="hidden text-right text-xs tabular-nums text-muted-foreground lg:block">
                {e.watch_hours} ц
            </span>

            <span className="hidden justify-end lg:flex">
                {e.overdue > 0
                    ? <Tag tone="rose">{e.overdue}</Tag>
                    : <span className="text-[11px] text-muted-foreground/50">—</span>}
            </span>

            <span className="hidden text-right text-xs tabular-nums xl:block">
                {e.exams_taken === 0 ? (
                    <span className="text-muted-foreground/50">—</span>
                ) : (
                    <>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {e.exams_passed}
                        </span>
                        <span className="text-muted-foreground/60">/{e.exams_taken}</span>
                    </>
                )}
            </span>

            <span className="hidden text-right text-xs tabular-nums xl:block">
                {e.avg_exam_score === null
                    ? <span className="text-muted-foreground/50">—</span>
                    : `${e.avg_exam_score}%`}
            </span>

            <span className="hidden truncate text-right text-[11px] tabular-nums text-muted-foreground xl:block">
                {e.last_viewed_at ?? '—'}
            </span>
        </Link>
    );
}

/* ── Сэтгэгдлийн модерац ───────────────────────────────────────────────── */
function CommentList({ comments }: { comments: CommentRow[] }) {
    const [query, setQuery] = useState('');
    const [only, setOnly]   = useState<'all' | 'pinned' | 'hidden'>('all');

    const rows = useMemo(() => {
        const term = query.trim().toLowerCase();

        return comments.filter((c) => {
            if (only === 'pinned' && !c.is_pinned) return false;
            if (only === 'hidden' && !c.is_hidden) return false;
            if (!term) return true;

            return c.body.toLowerCase().includes(term)
                || c.user_name.toLowerCase().includes(term)
                || (c.lesson_title ?? '').toLowerCase().includes(term);
        });
    }, [comments, query, only]);

    return (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <TableHead icon={MessageSquare} title="Сэтгэгдэл" count={comments.length}>
                <div className="inline-flex h-8 rounded-lg border bg-muted/40 p-0.5">
                    {([
                        ['all', 'Бүгд', comments.length],
                        ['pinned', 'Онцолсон', comments.filter((c) => c.is_pinned).length],
                        ['hidden', 'Нуусан', comments.filter((c) => c.is_hidden).length],
                    ] as const).map(([key, label, count]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setOnly(key)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-medium transition',
                                only === key
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {label}
                            <span className="tabular-nums opacity-50">{count}</span>
                        </button>
                    ))}
                </div>

                <TableSearch value={query} onChange={setQuery} placeholder="Сэтгэгдэл хайх" />
            </TableHead>

            {rows.length === 0 ? (
                <Empty
                    title={query || only !== 'all' ? 'Илэрц олдсонгүй' : 'Сэтгэгдэл байхгүй байна'}
                    text={
                        query || only !== 'all'
                            ? 'Хайлт эсвэл шүүлтээ өөрчилж үзнэ үү.'
                            : 'Ажилтнууд хичээл үзэж эхэлмэгц энд гарч ирнэ.'
                    }
                />
            ) : (
                rows.map((c, i) => <LabCommentItem key={c.id} comment={c} first={i === 0} withLesson />)
            )}
        </section>
    );
}
