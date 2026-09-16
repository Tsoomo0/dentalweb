import {
    CARD, CARD_HOVER, Chip, DocumentRow, EmptyState, FIELD,
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
    AlertTriangle, ArrowRight, BookOpen, CheckCircle2, FileText, FolderOpen,
    Search, Sparkles, Video, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * Ажилтны тал — ФАЙЛ сургалтын каталог.
 *
 * ДҮРСЛЭЛИЙН БОДОЛ: видео каталог нь постерын хана байдаг бол баримт нь
 * уншдаг зүйл. Тиймээс энд сургалт бүр НЭЭЛТТЭЙ жагсаалт болж, баримтууд нь
 * шууд харагдана — өөр хуудас руу орж байж юу байгааг мэдэх шаардлагагүй.
 * Явц нь минут биш ХУУДСААР хэмжигдэнэ.
 *
 * Видео сургалт /my/training дээр тусдаа амьдарна.
 */

/**
 * Хэлбэрүүд нь гар утасны хувилбартай ЯГ нэг өгөгдлөөс гардаг тул суурийг нь
 * тэндээс өвлөөд, энэ хуудсанд л хэрэгтэй талбаруудыг нэмнэ.
 */
interface Lesson extends MobileLesson {
    section_id: number | null;
    file_size: number;
    doc_source_name: string | null;
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

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Файл сургалт', href: '/my/training/documents' }];

type Filter = 'all' | 'reading' | 'unseen' | 'done' | 'required';

const FILTERS: { key: Filter; label: string; match: (l: Lesson) => boolean }[] = [
    { key: 'all',      label: 'Бүгд',        match: () => true },
    { key: 'reading',  label: 'Уншиж байгаа', match: (l) => l.progress > 0 && !l.is_completed },
    { key: 'unseen',   label: 'Уншаагүй',    match: (l) => l.progress === 0 },
    { key: 'done',     label: 'Дуусгасан',   match: (l) => l.is_completed },
    { key: 'required', label: 'Заавал',      match: (l) => l.is_required && !l.is_completed },
];

export default function LabDocumentCatalogue({ categories, courses, examStats, resume, stats }: Props) {
    const [query, setQuery]     = useState('');
    const [filter, setFilter]   = useState<Filter>('all');
    const [openCat, setOpenCat] = useState<number | null>(null);

    const allLessons = useMemo(() => courses.flatMap((c) => c.lessons), [courses]);
    const percent    = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    const overdue    = allLessons.filter((l) => l.is_overdue);
    const pages      = allLessons.reduce((n, l) => n + l.page_count, 0);

    /** Хайлт + шүүлтийг баримт бүр дээр тавьж, хоосон бүлэг/сургалтыг хаяна. */
    const visible = useMemo(() => {
        const q     = query.trim().toLowerCase();
        const match = FILTERS.find((f) => f.key === filter)!.match;

        const keep = (l: Lesson) =>
            match(l) && (q === '' || l.title.toLowerCase().includes(q)
                || (l.description ?? '').toLowerCase().includes(q)
                || (l.doc_source_name ?? '').toLowerCase().includes(q));

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
            <Head title="Файл сургалт" />

            {/* ═══════════════════ MOBILE ═══════════════════ */}
            <MyTrainingMobile
                kind="document"
                categories={categories}
                resume={resume}
                stats={stats}
                examStats={examStats}
            />

            {/* ═══════════════════ DESKTOP ═══════════════════ */}
            <div className="hidden w-full flex-col gap-3 p-4 md:flex md:p-6">
                {/* ── Толгой ─────────────────────────────────────────────── */}
                <section className="relative overflow-hidden rounded-2xl bg-[#080C12] text-white shadow-xl shadow-black/20 ring-1 ring-white/10">
                    <div className="pointer-events-none absolute -right-28 -top-32 size-[26rem] rounded-full bg-sky-600/25 blur-[100px]" />
                    <div className="pointer-events-none absolute -bottom-32 left-1/4 size-80 rounded-full bg-teal-500/15 blur-[90px]" />

                    {/* Мөр мөр татсан дэвсгэр — цаасны шугам санагдуулна */}
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.06]"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px)',
                            backgroundSize: '100% 18px',
                            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
                            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
                        }}
                    />

                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200 ring-1 ring-inset ring-white/15 backdrop-blur">
                                    <Sparkles className="size-3" />
                                    {resume ? 'Үргэлжлүүлэх' : 'Лабораторийн сургалт'}
                                </span>

                                <Link
                                    href="/my/training"
                                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/70 ring-1 ring-inset ring-white/15 backdrop-blur transition hover:bg-white/20 hover:text-white"
                                >
                                    <Video className="size-3" />
                                    Видео сургалт
                                </Link>
                            </div>

                            <h1 className="mt-3 truncate bg-gradient-to-br from-white to-white/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-[30px]">
                                {resume ? resume.title : 'Файл сургалт'}
                            </h1>

                            <p className="mt-1 truncate text-sm text-white/45">
                                {resume
                                    ? [resume.course_title, resume.left_label].filter(Boolean).join(' · ')
                                    : 'Заавар, журам, илтгэлүүдээ уншиж танилцана.'}
                            </p>

                            {resume && (
                                <div className="mt-5 flex flex-wrap items-center gap-4">
                                    <Link
                                        href={`/my/training/lessons/${resume.lesson_id}`}
                                        className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-950 shadow-lg shadow-black/30 transition hover:bg-white/90 active:scale-95"
                                    >
                                        <FileText className="size-4 transition group-hover:scale-110" />
                                        Үргэлжлүүлэн унших
                                    </Link>

                                    <div className="flex min-w-[160px] flex-1 items-center gap-2.5">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10 ring-1 ring-inset ring-white/10">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-teal-300 transition-all duration-700"
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

                        <div className="flex shrink-0 items-center gap-5 rounded-2xl bg-white/[0.05] p-4 shadow-inner ring-1 ring-inset ring-white/10 backdrop-blur-md sm:gap-7 sm:p-5">
                            <ProgressRing percent={percent} size={70} stroke={6} className="text-white" />

                            <div className="grid grid-cols-2 gap-x-7 gap-y-3">
                                <HeroStat value={`${stats.done}/${stats.total}`} label="баримт" />
                                <HeroStat value={pages > 0 ? String(pages) : '—'} label="нийт хуудас" />
                                <HeroStat
                                    value={String(stats.required)} label="заавал унших"
                                    tone={stats.required > 0 ? 'text-amber-300' : undefined}
                                />
                                <HeroStat
                                    value={String(stats.overdue)} label="хугацаа хэтэрсэн"
                                    tone={stats.overdue > 0 ? 'text-rose-300' : undefined}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Хугацаа хэтэрсэн ───────────────────────────────────── */}
                {overdue.length > 0 && (
                    <section className={cn('rounded-2xl border p-4', TONE.rose.edge, TONE.rose.surface)}>
                        <p className={cn('flex items-center gap-2 text-sm font-semibold', TONE.rose.text)}>
                            <AlertTriangle className="size-4" />
                            Хугацаа хэтэрсэн {overdue.length} баримт
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {overdue.map((l) => (
                                <Link
                                    key={l.id}
                                    href={`/my/training/lessons/${l.id}`}
                                    className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition hover:shadow"
                                >
                                    <FileText className="size-3.5 text-rose-500" />
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
                                placeholder="Баримт хайх…"
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
                                                ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/25'
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

                {/* ── Ангилал → Сургалт → Баримтууд ──────────────────────── */}
                {visible.length === 0 ? (
                    <EmptyState
                        icon={FolderOpen}
                        title={query || filter !== 'all' ? 'Илэрц олдсонгүй' : 'Одоогоор файл сургалт байхгүй байна'}
                        description={
                            query || filter !== 'all'
                                ? 'Хайлт эсвэл шүүлтүүрээ өөрчилж үзнэ үү.'
                                : 'Шинэ баримт нэмэгдэхэд танд мэдэгдэл ирнэ.'
                        }
                    />
                ) : (
                    <>
                        {(query || filter !== 'all') && (
                            <p className="px-1 text-xs text-muted-foreground">
                                <b className="text-foreground">{shownCount}</b> баримт олдлоо
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
                                    <header className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-muted/30 px-4 py-3 dark:border-gray-800">
                                        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl shadow-sm', TONE[cat.color].tile)}>
                                            {(() => { const I = categoryIcon(cat.icon); return <I className="size-4.5" />; })()}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <h2 className="truncate text-sm font-bold">{cat.name}</h2>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {cat.courses.length} сургалт · {lessons.length} баримт
                                                {cat.description ? ` · ${cat.description}` : ''}
                                            </p>
                                        </div>

                                        <ProgressRing
                                            percent={lessons.length ? (doneAll / lessons.length) * 100 : 0}
                                            size={36}
                                        />
                                    </header>

                                    <div className="space-y-3 p-3 sm:p-4">
                                        {cat.courses.map((course) => (
                                            <CourseShelf key={course.id} course={course} tone={cat.color} />
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

/* ── Нэг сургалтын тавиур ──────────────────────────────────────────────── */
/**
 * Видео каталогийн карт нь дотогшоо дарж ордог бол энд баримтууд ШУУД
 * харагдана — жагсаалт богино, гарчиг нь өөрөө агуулгаа хэлж байдаг тул
 * дахин нэг дарах алхам нэмэх нь зөвхөн саад болно.
 */
function CourseShelf({ course, tone }: { course: Course; tone: Tone }) {
    const pct  = course.total > 0 ? (course.done / course.total) * 100 : 0;
    const done = course.done === course.total && course.total > 0;

    // Бүлэг нэг ч нэргүй бол илүүц шатлал үүсгэхгүй, шууд мөрүүдээ эгнүүлнэ
    const flat = course.sections.length === 1 && !course.sections[0].title;

    let index = 0;

    return (
        <article className={cn(CARD, CARD_HOVER, 'overflow-hidden')}>
            <header className={cn('flex flex-wrap items-center gap-3 border-b px-3 py-3 sm:px-4', TONE[tone].surface)}>
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TONE[tone].tile)}>
                    <BookOpen className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold">{course.title}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span className="tabular-nums">{course.total} баримт</span>
                        {course.page_total > 0 && <span className="tabular-nums">{course.page_total} хуудас</span>}
                        {course.description && <span className="truncate">{course.description}</span>}
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {course.overdue > 0 ? (
                        <Chip tone="rose">{course.overdue} хоцорсон</Chip>
                    ) : course.required > 0 ? (
                        <Chip tone="amber">{course.required} заавал</Chip>
                    ) : null}

                    <span className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums',
                        done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                             : pct > 0 ? TONE[tone].chip
                             : 'bg-muted text-muted-foreground',
                    )}>
                        {done ? <CheckCircle2 className="mr-1 inline size-3" /> : null}
                        {Math.round(pct)}%
                    </span>

                    <Link
                        href={`/my/training/courses/${course.id}`}
                        title="Сургалтын хуудсыг нээх"
                        className="grid size-7 place-items-center rounded-lg border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <ArrowRight className="size-3.5" />
                    </Link>
                </div>
            </header>

            {course.sections.map((section) => (
                <div key={section.id}>
                    {!flat && (
                        <p className="flex items-center gap-1.5 border-b bg-muted/25 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground sm:px-4">
                            {section.title ?? 'Бусад баримт'}
                            <span className="tabular-nums opacity-60">{section.lessons.length}</span>
                        </p>
                    )}

                    <ul>
                        {section.lessons.map((lesson) => (
                            <DocumentRow key={lesson.id} lesson={lesson} index={++index} tone={tone} />
                        ))}
                    </ul>
                </div>
            ))}
        </article>
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
