import {
    CARD, CARD_HOVER, Chip, EmptyState, FIELD,
    TONE, categoryIcon, type Tone,
} from '@/components/lab-training-ui';
import ProgressRing from '@/components/progress-ring';
import MyTrainingMobile, {
    type MobileCategory, type MobileCourse, type MobileLesson,
} from '@/components/my-training-mobile';
import MyLayout from '@/layouts/my-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle, BookOpen, CheckCircle2, Clock, FileText,
    GraduationCap, Play, PlayCircle, Search, Sparkles, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * Хэлбэрүүд нь гар утасны хувилбартай ЯГ нэг өгөгдлөөс гардаг (нэг
 * контроллерын нэг арга) тул суурийг нь тэндээс өвлөнө — нэг талд талбар
 * нэмэхэд нөгөө нь дуугүй хоцрохгүй.
 */
interface Lesson extends MobileLesson {
    section_id: number | null;
}

interface Section { id: number; title: string | null; order: number; lessons: Lesson[] }

interface Course extends MobileCourse {
    cover_url: string | null;
    category_id: number | null;
    lessons: Lesson[];
    sections: Section[];
}

interface Category extends MobileCategory {
    color: Tone;
    icon: string;
    courses: Course[];
}

interface Props {
    categories: Category[];
    courses: Course[];
    examStats: { total: number; open: number; todo: number };
    resume: {
        lesson_id: number;
        title: string;
        course_title: string | null;
        poster_url: string | null;
        progress: number;
        left_label: string;
    } | null;
    stats: { total: number; done: number; required: number; overdue: number; watch_min: number };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Видео сургалт', href: '/my/training' }];

type Filter = 'all' | 'watching' | 'unseen' | 'done' | 'required';

const FILTERS: { key: Filter; label: string; match: (l: Lesson) => boolean }[] = [
    { key: 'all',      label: 'Бүгд',        match: () => true },
    { key: 'watching', label: 'Үзэж байгаа', match: (l) => l.progress > 0 && !l.is_completed },
    { key: 'unseen',   label: 'Үзээгүй',     match: (l) => l.progress === 0 },
    { key: 'done',     label: 'Дуусгасан',   match: (l) => l.is_completed },
    { key: 'required', label: 'Заавал',      match: (l) => l.is_required && !l.is_completed },
];

export default function LabTrainingIndex({ categories, courses, examStats, resume, stats }: Props) {
    const [query, setQuery]   = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [openCat, setOpenCat] = useState<number | null>(null);   // null → бүх ангилал

    const allLessons = useMemo(() => courses.flatMap((c) => c.lessons), [courses]);
    const percent    = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    const overdue    = allLessons.filter((l) => l.is_overdue);

    /** Хайлт + шүүлтүүрийг хичээл бүр дээр тавьж, хоосон бүлэг/сургалтыг хаяна. */
    const visible = useMemo(() => {
        const q     = query.trim().toLowerCase();
        const match = FILTERS.find((f) => f.key === filter)!.match;

        const keep = (l: Lesson) =>
            match(l) && (q === '' || l.title.toLowerCase().includes(q)
                || (l.description ?? '').toLowerCase().includes(q));

        return categories
            .filter((cat) => openCat === null || cat.id === openCat)
            .map((cat) => ({
                ...cat,
                courses: cat.courses
                    .map((course) => ({
                        ...course,
                        sections: course.sections
                            .map((s) => ({ ...s, lessons: s.lessons.filter(keep) }))
                            .filter((s) => s.lessons.length > 0),
                    }))
                    .filter((course) => course.sections.length > 0),
            }))
            .filter((cat) => cat.courses.length > 0);
    }, [categories, query, filter, openCat]);

    const shownCount = visible.reduce(
        (n, cat) => n + cat.courses.reduce((m, c) => m + c.sections.reduce((k, s) => k + s.lessons.length, 0), 0),
        0,
    );

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title="Видео сургалт" />

            {/* ═══════════════════ MOBILE ═══════════════════ */}
            <MyTrainingMobile
                kind="video"
                categories={categories}
                resume={resume}
                stats={stats}
                examStats={examStats}
            />

            {/* ═══════════════════ DESKTOP ═══════════════════ */}
            <div className="hidden w-full flex-col gap-3 p-4 md:flex md:p-6">
                {/* ── Толгой ─────────────────────────────────────────────── */}
                <section className="relative overflow-hidden rounded-2xl bg-[#0A0A0F] text-white shadow-xl shadow-black/20 ring-1 ring-white/10">
                    {/* Үргэлжлүүлэх хичээлийн зураг — бүдэг дэвсгэр болгоно */}
                    {resume?.poster_url && (
                        <img src={resume.poster_url} alt="" className="absolute inset-0 size-full scale-125 object-cover opacity-[0.18] blur-2xl" />
                    )}

                    {/* Өнгөт гэрэлтүүлэг */}
                    <div className="pointer-events-none absolute -right-28 -top-32 size-[26rem] rounded-full bg-violet-600/25 blur-[100px]" />
                    <div className="pointer-events-none absolute -bottom-32 left-1/4 size-80 rounded-full bg-fuchsia-500/15 blur-[90px]" />

                    {/* Нарийн тор — гадаргууд бүтэц өгнө */}
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.07]"
                        style={{
                            backgroundImage:
                                'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px),' +
                                'linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
                            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
                        }}
                    />

                    {/* Дээд ирмэгийн гэрлийн зураас */}
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                        {/* Зүүн тал */}
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200 ring-1 ring-inset ring-white/15 backdrop-blur">
                                    <Sparkles className="size-3" />
                                    {resume ? 'Үргэлжлүүлэх' : 'Лабораторийн сургалт'}
                                </span>

                                <Link
                                    href="/my/training/documents"
                                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/70 ring-1 ring-inset ring-white/15 backdrop-blur transition hover:bg-white/20 hover:text-white"
                                >
                                    <FileText className="size-3" />
                                    Файл сургалт
                                </Link>
                            </div>

                            <h1 className="mt-3 truncate bg-gradient-to-br from-white to-white/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-[30px]">
                                {resume ? resume.title : 'Видео сургалт'}
                            </h1>

                            <p className="mt-1 truncate text-sm text-white/45">
                                {resume
                                    ? [resume.course_title, resume.left_label].filter(Boolean).join(' · ')
                                    : 'Хичээлүүдээ үзэж, мэдлэгээ шалгалтаар баталгаажуулна.'}
                            </p>

                            {resume && (
                                <div className="mt-5 flex flex-wrap items-center gap-4">
                                    <Link
                                        href={`/my/training/lessons/${resume.lesson_id}`}
                                        className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-950 shadow-lg shadow-black/30 transition hover:bg-white/90 active:scale-95"
                                    >
                                        <Play className="size-4 fill-current transition group-hover:scale-110" />
                                        Үргэлжлүүлэх
                                    </Link>

                                    <div className="flex min-w-[160px] flex-1 items-center gap-2.5">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10 ring-1 ring-inset ring-white/10">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all duration-700"
                                                style={{ width: `${resume.progress}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-semibold tabular-nums text-white/60">
                                            {resume.progress}%
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Баруун тал — шилэн самбар */}
                        <div className="flex shrink-0 items-center gap-5 rounded-2xl bg-white/[0.05] p-4 shadow-inner ring-1 ring-inset ring-white/10 backdrop-blur-md sm:gap-7 sm:p-5">
                            <ProgressRing percent={percent} size={70} stroke={6} className="text-white" />

                            <div className="grid grid-cols-2 gap-x-7 gap-y-3">
                                <HeroStat value={`${stats.done}/${stats.total}`} label="хичээл" />
                                <HeroStat value={`${stats.watch_min}`} label="минут үзсэн" />
                                <HeroStat value={`${stats.required}`} label="заавал үзэх" tone={stats.required > 0 ? 'text-amber-300' : undefined} />
                                <HeroStat value={`${stats.overdue}`} label="хугацаа хэтэрсэн" tone={stats.overdue > 0 ? 'text-rose-300' : undefined} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Хугацаа хэтэрсэн ───────────────────────────────────── */}
                {overdue.length > 0 && (
                    <section className={cn('rounded-2xl border p-4', TONE.rose.edge, TONE.rose.surface)}>
                        <p className={cn('flex items-center gap-2 text-sm font-semibold', TONE.rose.text)}>
                            <AlertTriangle className="size-4" />
                            Хугацаа хэтэрсэн {overdue.length} хичээл
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {overdue.map((l) => (
                                <Link
                                    key={l.id}
                                    href={`/my/training/lessons/${l.id}`}
                                    className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition hover:shadow"
                                >
                                    <PlayCircle className="size-3.5 text-rose-500" />
                                    {l.title}
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Хайлт, шүүлтүүр, ангилал ───────────────────────────── */}
                <div className="space-y-2 rounded-xl border border-gray-200 bg-card p-2 shadow-sm dark:border-gray-800">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Хичээл хайх…"
                                className={cn(FIELD, 'pl-10 pr-9')}
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition hover:bg-muted"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            {FILTERS.map((f) => {
                                const n = allLessons.filter(f.match).length;

                                return (
                                    <button
                                        key={f.key}
                                        onClick={() => setFilter(f.key)}
                                        className={cn(
                                            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                                            filter === f.key
                                                ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/25'
                                                : 'bg-muted/70 text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        {f.label}
                                        <span className={cn(
                                            'rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                                            filter === f.key ? 'bg-white/25' : 'bg-background/70',
                                        )}>
                                            {n}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Ангилалын шүүр */}
                    {categories.length > 1 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                onClick={() => setOpenCat(null)}
                                className={cn(
                                    'rounded-full px-3 py-1.5 text-xs font-medium transition',
                                    openCat === null ? 'bg-foreground text-background' : 'bg-muted/70 hover:bg-muted',
                                )}
                            >
                                Бүх ангилал
                            </button>

                            {categories.map((cat) => {
                                const Icon   = categoryIcon(cat.icon);
                                const active = openCat === cat.id;
                                const count  = cat.courses.reduce((n, c) => n + c.total, 0);

                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setOpenCat(active ? null : cat.id)}
                                        className={cn(
                                            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                                            active
                                                ? cn(TONE[cat.color].chip, 'ring-1 ring-current/20')
                                                : 'bg-muted/70 text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        <Icon className="size-3.5" />
                                        {cat.name}
                                        <span className="text-[10px] font-bold tabular-nums opacity-60">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Шалгалт → тусдаа хуудас ────────────────────────────── */}
                {examStats.total > 0 && (
                    <Link
                        href="/my/training/exams"
                        className={cn(
                            'flex flex-wrap items-center gap-3 rounded-2xl border p-4 transition hover:shadow-md',
                            TONE.indigo.edge, TONE.indigo.surface,
                        )}
                    >
                        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TONE.indigo.tile)}>
                            <GraduationCap className="size-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">Шалгалт</p>
                            <p className="text-xs text-muted-foreground">
                                {examStats.open > 0
                                    ? `${examStats.open} шалгалт нээлттэй байна`
                                    : 'Одоогоор нээлттэй шалгалт байхгүй'}
                                {` · Нийт ${examStats.total}`}
                            </p>
                        </div>

                        {examStats.todo > 0 && <Chip tone="violet">{examStats.todo} өгөх</Chip>}

                        <span className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">
                            Бүгдийг харах →
                        </span>
                    </Link>
                )}

                {/* ── Ангилал → Сургалт → Бүлэг → Хичээл ─────────────────── */}
                {visible.length === 0 ? (
                    <EmptyState
                        icon={BookOpen}
                        title={query || filter !== 'all' ? 'Илэрц олдсонгүй' : 'Одоогоор сургалт байхгүй байна'}
                        description={
                            query || filter !== 'all'
                                ? 'Хайлт эсвэл шүүлтүүрээ өөрчилж үзнэ үү.'
                                : 'Шинэ хичээл нэмэгдэхэд танд мэдэгдэл ирнэ.'
                        }
                    />
                ) : (
                    <>
                        {(query || filter !== 'all') && (
                            <p className="px-1 text-xs text-muted-foreground">
                                <b className="text-foreground">{shownCount}</b> хичээл олдлоо
                            </p>
                        )}

                        {visible.map((cat) => {
                            const lessons = cat.courses.flatMap((c) => c.lessons);
                            const doneAll = lessons.filter((l) => l.is_completed).length;

                            return (
                                <section
                                    key={cat.id}
                                    className="overflow-hidden rounded-xl border border-gray-200 bg-card shadow-sm dark:border-gray-800"
                                >
                                    {/* Ангилалын толгой */}
                                    <header className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-muted/30 px-4 py-3 dark:border-gray-800">
                                        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl shadow-sm', TONE[cat.color].tile)}>
                                            {(() => { const I = categoryIcon(cat.icon); return <I className="size-4.5" />; })()}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <h2 className="truncate text-sm font-bold">{cat.name}</h2>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {cat.courses.length} сургалт · {lessons.length} хичээл
                                                {cat.description ? ` · ${cat.description}` : ''}
                                            </p>
                                        </div>

                                        <ProgressRing
                                            percent={lessons.length ? (doneAll / lessons.length) * 100 : 0}
                                            size={36}
                                        />
                                    </header>

                                    {/* auto-fill — ганц сургалт байлаа ч карт сунахгүй */}
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3 p-3 sm:p-4">
                                        {cat.courses.map((course) => (
                                            <CourseCard key={course.id} course={course} tone={cat.color} />
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </>
                )}
            </div>
        </MyLayout>
    );
}

/* ── Нэг сургалтын карт ────────────────────────────────────────────────── */
function CourseCard({ course, tone }: { course: Course; tone: Tone }) {
    const shown = course.sections.reduce((n, s) => n + s.lessons.length, 0);
    const pct   = course.total > 0 ? (course.done / course.total) * 100 : 0;
    const done  = course.done === course.total && course.total > 0;

    return (
        <Link
            href={`/my/training/courses/${course.id}`}
            className={cn(
                CARD, CARD_HOVER,
                'group flex h-full flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1',
            )}
        >
            {/* Нүүр зураг */}
            <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-neutral-900">
                {course.poster_url ? (
                    <img
                        src={course.poster_url}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                    />
                ) : (
                    <div className={cn('grid size-full place-items-center', TONE[tone].tile)}>
                        <BookOpen className="size-8 opacity-40" />
                    </div>
                )}

                {/* Тоглуулах давхарга */}
                <div className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 group-hover:opacity-100">
                    <span className="grid size-12 place-items-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur-md">
                        <Play className="ml-0.5 size-5 fill-white text-white" />
                    </span>
                </div>

                {/* Хичээлийн тоо */}
                <span className="absolute left-2.5 top-2.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                    {course.total} хичээл
                </span>

                {/* Анхааруулга */}
                <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
                    {course.overdue > 0 ? (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                            {course.overdue} хоцорсон
                        </span>
                    ) : course.required > 0 ? (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                            Заавал
                        </span>
                    ) : null}

                    {done && (
                        <span className="grid size-6 place-items-center rounded-full bg-emerald-500 text-white shadow">
                            <CheckCircle2 className="size-4" />
                        </span>
                    )}
                </div>

                {/* Явцын зурвас */}
                {pct > 0 && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                        <span
                            className={cn('block h-full transition-all duration-700', done ? 'bg-emerald-500' : TONE[tone].bar)}
                            style={{ width: `${pct}%` }}
                        />
                    </span>
                )}
            </div>

            {/* Бие */}
            <div className="flex flex-1 flex-col p-3.5">
                <h3 className="line-clamp-2 text-sm font-bold leading-snug transition group-hover:text-violet-600 dark:group-hover:text-violet-400">
                    {course.title}
                </h3>

                {course.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {course.description}
                    </p>
                )}

                <div className="mt-auto pt-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
                        <span className="flex items-center gap-2.5">
                            <span className="inline-flex items-center gap-1">
                                <PlayCircle className="size-3" />
                                {course.done}/{course.total}
                            </span>
                            {course.duration_min > 0 && (
                                <span className="inline-flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {course.duration_min} мин
                                </span>
                            )}
                        </span>

                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                                done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                     : pct > 0 ? TONE[tone].chip
                                     : 'bg-muted text-muted-foreground',
                            )}
                        >
                            {Math.round(pct)}%
                        </span>
                    </div>

                    {shown !== course.total && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                            Хайлтад {shown} хичээл тохирлоо
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}

/* ── Хар толгойн доторх үзүүлэлт ───────────────────────────────────────── */
function HeroStat({ value, label, tone }: { value: string; label: string; tone?: string }) {
    return (
        <div className="min-w-0">
            <p className={cn('text-lg font-bold leading-none tabular-nums', tone ?? 'text-white')}>{value}</p>
            <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-white/35">{label}</p>
        </div>
    );
}
