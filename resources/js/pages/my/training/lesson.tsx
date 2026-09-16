import MyScroll from '@/components/my-scroll';
import LabDocumentViewer, { type DocumentInfo } from '@/components/lab-document-viewer';
import LabLessonPlayer, { clock, type PlayerHandle } from '@/components/lab-lesson-player';
import {
    BTN_PRIMARY, CARD, Chip, EmptyState, FIELD, humanSize, ProgressBar,
} from '@/components/lab-training-ui';
import ProgressRing from '@/components/progress-ring';
import MyLayout from '@/layouts/my-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle, ArrowLeft, ArrowRight, BookmarkPlus, CalendarClock, CheckCircle2,
    Circle, Clock, Download, FileText, GraduationCap, ListVideo, MessageSquare,
    PlayCircle, Search, Send, StickyNote, Trash2, X,
} from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';

interface Comment {
    id: number;
    body: string;
    user_name: string;
    is_mine: boolean;
    is_pinned: boolean;
    is_hidden: boolean;
    created_at: string | null;
    reactions: Record<string, number>;
    my_reaction: string | null;
    replies?: Comment[];
}

interface Note { id: number; position: number; stamp: string; body: string }

interface CurriculumItem {
    id: number;
    section_id: number | null;
    title: string;
    duration: string;
    is_required: boolean;
    progress: number;
    completed: boolean;
}

interface Props {
    lesson: {
        id: number;
        title: string;
        description: string | null;
        duration_seconds: number;
        duration_label: string;
        poster_url: string | null;
        kind: 'video' | 'document';
        playback: { provider: 'file' | 'youtube'; src: string } | null;
        document: DocumentInfo | null;
        attachments: { name: string; url: string; size: number }[];
        is_required: boolean;
        due_at: string | null;
        is_overdue: boolean;
    };
    course: {
        id: number;
        title: string;
        lessons: CurriculumItem[];
        sections: { id: number; title: string; order: number }[];
    };
    prev: { id: number; title: string } | null;
    next: { id: number; title: string } | null;
    progress: { last_position: number; percent: number; completed: boolean; seen_pages: number[] };
    notes: Note[];
    comments: Comment[];
    reactionTypes: Record<string, string>;
    reactions: { counts: Record<string, number>; mine: string | null };
    exams: { id: number; title: string; state: 'open' | 'upcoming' | 'closed'; is_open: boolean }[];
}

type Tab = 'overview' | 'notes' | 'files' | 'comments';

export default function LabLessonPage({
    lesson, course, prev, next, progress, notes, comments, reactionTypes, reactions, exams,
}: Props) {
    const [live, setLive] = useState({ percent: progress.percent, completed: progress.completed });
    const [tab, setTab]   = useState<Tab>('overview');
    const player          = useRef<PlayerHandle>(null);

    const isDoc = lesson.kind === 'document';

    // Баримт хичээлийг дуусгах товч нь СҮҮЛИЙН хуудсыг үзсэн үед л нээгдэнэ.
    // Анхны утгыг серверийн өгсөн хуудсуудаас бодно — ажилтан завсарлаад
    // буцаж ирэхэд товч дахин түгжигдэх ёсгүй.
    const [canFinish, setCanFinish] = useState(
        isDoc
        && (lesson.document?.page_count ?? 0) > 0
        && progress.seen_pages.includes((lesson.document?.page_count ?? 0) - 1),
    );
    const [finishing, setFinishing] = useState(false);

    // Буцах гарц нь ирсэн каталог руугаа — файл хичээлээс видео каталог руу
    // шидэгдвэл хэрэглэгч замаа алдана
    const catalogue = isDoc ? '/my/training/documents' : '/my/training';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isDoc ? 'Файл сургалт' : 'Видео сургалт', href: catalogue },
        { title: course.title, href: `/my/training/courses/${course.id}` },
        { title: lesson.title, href: `/my/training/lessons/${lesson.id}` },
    ];

    const done  = course.lessons.filter((l) => l.completed).length;
    const index = course.lessons.findIndex((l) => l.id === lesson.id);

    const react = (target: 'lesson' | 'comment', id: number, type: string) =>
        router.post('/my/training/react', { target, id, type }, { preserveScroll: true });

    const goNext = () => next && router.visit(`/my/training/lessons/${next.id}`);

    const commentCount = comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);

    const tabs: { key: Tab; label: string; count: number | null }[] = [
        { key: 'overview', label: 'Тойм', count: null },
        { key: 'notes', label: 'Тэмдэглэл', count: notes.length },
        { key: 'files', label: 'Хавсралт', count: lesson.attachments.length },
        { key: 'comments', label: 'Сэтгэгдэл', count: commentCount },
    ];

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title={lesson.title} />

            <MyScroll className="w-full bg-[var(--my-page-bg)] p-4 sm:p-6 md:bg-transparent lg:p-8 2xl:px-10">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
                    {/* ── Үндсэн багана ──────────────────────────────────── */}
                    <div className="min-w-0 space-y-5">
                        {/* Утсан дээр медиа нь ирмэгээс ирмэг хүртэл — гар утасны
                            тоглуулагч бүр ийм байдаг тул энэ нь илүү танил, мөн
                            нарийхан дэлгэцэнд илүү өргөн дүрс өгнө */}
                        <div className="-mx-4 overflow-hidden sm:mx-0 sm:rounded-2xl">
                        {isDoc && lesson.document ? (
                            <LabDocumentViewer
                                lessonId={lesson.id}
                                document={lesson.document}
                                seenPages={progress.seen_pages}
                                onProgress={({ percent, completed, canFinish: ok }) => {
                                    setLive({ percent, completed });
                                    setCanFinish(ok);
                                }}
                            />
                        ) : lesson.playback ? (
                            <LabLessonPlayer
                                ref={player}
                                lessonId={lesson.id}
                                playback={lesson.playback}
                                poster={lesson.poster_url}
                                startAt={progress.last_position}
                                title={lesson.title}
                                onProgress={setLive}
                                next={next}
                                onNext={goNext}
                            />
                        ) : null}
                        </div>

                        {/* ── Гарчиг, төлөв, reaction ────────────────────── */}
                        <section className={cn(CARD, 'p-4 sm:p-5')}>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                                <Link
                                    href={`/my/training/courses/${course.id}`}
                                    className="font-semibold text-violet-600 transition hover:underline dark:text-violet-400"
                                >
                                    {course.title}
                                </Link>
                                <span className="text-muted-foreground/50">·</span>
                                <span className="tabular-nums text-muted-foreground">
                                    {index + 1} / {course.lessons.length}-р хичээл
                                </span>
                                {lesson.is_required && <Chip tone="amber">Заавал үзэх</Chip>}
                                {live.completed && (
                                    <Chip tone="emerald" icon={CheckCircle2}>
                                        Дуусгасан
                                    </Chip>
                                )}
                            </div>

                            <h1 className="mt-2 text-xl font-bold leading-snug tracking-tight sm:text-2xl">
                                {lesson.title}
                            </h1>

                            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-4">
                                <div className="flex items-center gap-2.5">
                                    <ProgressRing percent={live.percent} size={40} stroke={4} />
                                    <div className="text-xs leading-tight">
                                        <p className="font-semibold">
                                            {live.completed ? 'Үзэж дууссан' : 'Үзэлтийн явц'}
                                        </p>
                                        <p className="mt-0.5 inline-flex items-center gap-1 text-muted-foreground">
                                            <Clock className="size-3" />
                                            {lesson.duration_label}
                                        </p>
                                    </div>
                                </div>

                                <span className="hidden h-8 w-px bg-border sm:block" />

                                <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                                    {Object.entries(reactionTypes).map(([type, emoji]) => {
                                        const active = reactions.mine === type;

                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => react('lesson', lesson.id, type)}
                                                aria-pressed={active}
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition active:scale-95',
                                                    active
                                                        ? 'border-violet-300 bg-violet-50 dark:border-violet-500/50 dark:bg-violet-500/15'
                                                        : 'border-transparent bg-muted/60 hover:bg-muted',
                                                )}
                                            >
                                                <span className="text-base leading-none">{emoji}</span>
                                                <span className="text-xs font-semibold tabular-nums">
                                                    {reactions.counts[type] ?? 0}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {lesson.is_required && lesson.due_at && !live.completed && (
                                <div
                                    className={cn(
                                        'mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm',
                                        lesson.is_overdue
                                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                                            : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
                                    )}
                                >
                                    {lesson.is_overdue ? (
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    ) : (
                                        <CalendarClock className="mt-0.5 size-4 shrink-0" />
                                    )}
                                    <p>
                                        {lesson.is_overdue ? 'Хугацаа хэтэрсэн — ' : 'Үзэж дуусгах хугацаа: '}
                                        <span className="font-semibold">{lesson.due_at}</span>
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* ── Баримт хичээлийг дуусгах ────────────────────
                            Видео нь 90% хүрэхэд өөрөө дуусгасан болдог. Баримтыг
                            ажилтан өөрөө баталгаажуулна — гэхдээ СҮҮЛИЙН хуудсыг
                            үзсэн үед л товч нээгдэнэ.

                            Утсан дээр энэ нь доод талд наалдаж, хөвөгч цэсний
                            дээр үлддэг: уншиж дуусаад товчоо хайж доош гүйлгэх
                            шаардлагагүй. */}
                        {isDoc && (
                            <div className={cn(
                                'sticky bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-10 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 shadow-lg shadow-black/10',
                                'md:static md:bottom-auto md:rounded-xl md:shadow-none',
                                live.completed
                                    ? 'bg-emerald-50 dark:bg-emerald-500/15'
                                    : 'bg-card ring-1 ring-black/[0.06] dark:ring-white/10 md:bg-muted/60 md:ring-0',
                            )}>
                                {live.completed ? (
                                    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                        <CheckCircle2 className="size-4 shrink-0" />
                                        Энэ хичээлийг үзэж дуусгасан
                                    </p>
                                ) : (
                                    <>
                                        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                                            {canFinish
                                                ? 'Бүх хуудсыг үзлээ. Дуусгасан гэж тэмдэглэнэ үү.'
                                                : 'Сүүлийн хуудас хүртэл уншсаны дараа дуусгах товч нээгдэнэ.'}
                                        </p>

                                        <button
                                            type="button"
                                            disabled={!canFinish || finishing}
                                            onClick={() => {
                                                setFinishing(true);
                                                router.post(
                                                    `/my/training/lessons/${lesson.id}/complete`,
                                                    {},
                                                    {
                                                        preserveScroll: true,
                                                        onSuccess: () => setLive((v) => ({ ...v, completed: true })),
                                                        onFinish: () => setFinishing(false),
                                                    },
                                                );
                                            }}
                                            className={cn(
                                                'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-5 text-sm font-semibold text-white transition md:h-9 md:rounded-lg md:px-4 md:text-xs',
                                                'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]',
                                                'disabled:pointer-events-none disabled:opacity-40',
                                            )}
                                        >
                                            <CheckCircle2 className="size-4 md:size-3.5" />
                                            {finishing ? 'Тэмдэглэж байна…' : 'Үзэж дууслаа'}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── Табууд ─────────────────────────────────────── */}
                        <div className="-mx-1 overflow-x-auto px-1 pb-1">
                            <div className="inline-flex gap-1 rounded-xl bg-muted/60 p-1">
                                {tabs.map((item) => {
                                    const active = tab === item.key;

                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => setTab(item.key)}
                                            aria-pressed={active}
                                            className={cn(
                                                'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition md:px-3.5 md:py-2 md:font-medium',
                                                active
                                                    ? 'bg-card text-foreground shadow-sm ring-1 ring-black/[0.04] dark:ring-white/10'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            {item.label}
                                            {item.count !== null && item.count > 0 && (
                                                <span
                                                    className={cn(
                                                        'rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums',
                                                        active
                                                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                                                            : 'bg-black/[0.06] text-muted-foreground dark:bg-white/10',
                                                    )}
                                                >
                                                    {item.count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <section className={cn(CARD, 'p-4 sm:p-5')}>
                            {tab === 'overview' && (
                                <div className="space-y-5">
                                    <div>
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Хичээлийн тайлбар
                                        </p>
                                        {lesson.description ? (
                                            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                                {lesson.description}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">Тайлбар оруулаагүй байна.</p>
                                        )}
                                    </div>

                                    {exams.length > 0 && (
                                        <div className="overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4 text-white sm:p-5">
                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex items-start gap-3">
                                                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
                                                        <GraduationCap className="size-5" />
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-semibold">Мэдлэгээ шалгаарай</p>
                                                        <p className="mt-0.5 text-xs text-white/70">
                                                            {exams.some((e) => e.is_open)
                                                                ? 'Энэ хичээлд холбогдох шалгалт бэлэн байна.'
                                                                : 'Энэ хичээлийн шалгалт одоогоор нээлттэй биш байна.'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {exams.map((e) => (
                                                        <Link
                                                            key={e.id}
                                                            href={`/my/training/exams/${e.id}`}
                                                            className={cn(
                                                                'rounded-xl px-4 py-2 text-xs font-bold transition active:scale-[0.98]',
                                                                e.is_open
                                                                    ? 'bg-white text-violet-700 hover:bg-white/90'
                                                                    : 'bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25',
                                                            )}
                                                        >
                                                            {e.title}
                                                            {e.state === 'upcoming' && ' · Хугацаа болоогүй'}
                                                            {e.state === 'closed' && ' · Хугацаа дууссан'}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {tab === 'notes' && (
                                <NotesPanel
                                    lessonId={lesson.id}
                                    notes={notes}
                                    getTime={() => player.current?.currentTime() ?? 0}
                                    onJump={(s) => player.current?.seekTo(s)}
                                    canStamp={lesson.playback?.provider === 'file'}
                                />
                            )}

                            {tab === 'files' &&
                                (lesson.attachments.length === 0 ? (
                                    <EmptyState
                                        icon={FileText}
                                        title="Хавсралт байхгүй"
                                        description="Энэ хичээлд нэмэлт материал хавсаргаагүй байна."
                                        className="border-0 py-8"
                                    />
                                ) : (
                                    <ul className="grid gap-2 sm:grid-cols-2">
                                        {lesson.attachments.map((file) => (
                                            <li key={file.url}>
                                                <a
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="group flex items-center gap-3 rounded-xl border bg-background p-3 transition hover:border-violet-300 hover:shadow-sm dark:hover:border-violet-500/40"
                                                >
                                                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                                                        <FileText className="size-5" />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-medium">
                                                            {file.name}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {humanSize(file.size)}
                                                        </span>
                                                    </span>
                                                    <Download className="size-4 shrink-0 text-muted-foreground transition group-hover:text-violet-600 dark:group-hover:text-violet-400" />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ))}

                            {tab === 'comments' && (
                                <CommentSection
                                    lessonId={lesson.id}
                                    comments={comments}
                                    reactionTypes={reactionTypes}
                                    onReact={(id, type) => react('comment', id, type)}
                                />
                            )}
                        </section>

                        {/* ── Өмнөх / дараах ─────────────────────────────── */}
                        {(prev || next) && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {prev ? (
                                    <Link
                                        href={`/my/training/lessons/${prev.id}`}
                                        className={cn(
                                            CARD,
                                            'group flex min-w-0 items-center gap-3 p-3 transition hover:border-violet-300 hover:shadow-md dark:hover:border-violet-500/40',
                                        )}
                                    >
                                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition group-hover:bg-violet-50 group-hover:text-violet-600 dark:group-hover:bg-violet-500/15 dark:group-hover:text-violet-300">
                                            <ArrowLeft className="size-4" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                Өмнөх хичээл
                                            </span>
                                            <span className="mt-0.5 block truncate text-sm font-semibold">
                                                {prev.title}
                                            </span>
                                        </span>
                                    </Link>
                                ) : (
                                    <span className="hidden sm:block" />
                                )}

                                {next && (
                                    <Link
                                        href={`/my/training/lessons/${next.id}`}
                                        className={cn(
                                            CARD,
                                            'group flex min-w-0 items-center justify-end gap-3 p-3 text-right transition hover:border-violet-300 hover:shadow-md dark:hover:border-violet-500/40',
                                        )}
                                    >
                                        <span className="min-w-0">
                                            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                Дараагийн хичээл
                                            </span>
                                            <span className="mt-0.5 block truncate text-sm font-semibold">
                                                {next.title}
                                            </span>
                                        </span>
                                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition group-hover:bg-violet-50 group-hover:text-violet-600 dark:group-hover:bg-violet-500/15 dark:group-hover:text-violet-300">
                                            <ArrowRight className="size-4" />
                                        </span>
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Хөтөлбөр ───────────────────────────────────────── */}
                    <Curriculum course={course} currentId={lesson.id} done={done} />
                </div>
            </MyScroll>
        </MyLayout>
    );
}

/* ── Хажуугийн хөтөлбөр ────────────────────────────────────────────────── */
function Curriculum({ course, currentId, done }: {
    course: Props['course'];
    currentId: number;
    done: number;
}) {
    const [query, setQuery] = useState('');
    const total   = course.lessons.length;
    const percent = total > 0 ? (done / total) * 100 : 0;

    /**
     * Хичээлүүдийг бүлгээр нь бүлэглэнэ. Дугаарлалт нь бүлэг дамжин
     * үргэлжилнэ (1, 2, 3…) — суралцагч нийт хэддэх нь байгаагаа хардаг.
     */
    const groups = useMemo(() => {
        const q     = query.trim().toLowerCase();
        const byId  = new Map(course.sections.map((s) => [s.id, s]));
        const order = new Map<number, number>();

        course.sections.forEach((s) => order.set(s.id, s.order));

        const numbered = course.lessons.map((lesson, i) => ({ lesson, number: i + 1 }));
        const buckets  = new Map<number, { title: string | null; order: number; items: typeof numbered }>();

        numbered.forEach((entry) => {
            const key = entry.lesson.section_id ?? 0;

            if (!buckets.has(key)) {
                buckets.set(key, {
                    title: byId.get(key)?.title ?? null,
                    order: order.get(key) ?? -1,
                    items: [],
                });
            }
            if (!q || entry.lesson.title.toLowerCase().includes(q)) {
                buckets.get(key)!.items.push(entry);
            }
        });

        return [...buckets.values()]
            .filter((b) => b.items.length > 0)
            .sort((a, b) => a.order - b.order);
    }, [course.lessons, course.sections, query]);

    const items = groups.flatMap((g) => g.items);

    // Ганц нэргүй бүлэг бол толгой харуулахгүй — илүүц шатлал үүсгэхгүй
    const showHeaders = groups.length > 1 || (groups.length === 1 && groups[0].title !== null);

    return (
        <aside className="xl:sticky xl:top-20 xl:h-fit">
            <div className={cn(CARD, 'overflow-hidden')}>
                <div className="border-b bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                        <ProgressRing percent={percent} size={46} stroke={5} />
                        <div className="min-w-0">
                            <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                <ListVideo className="size-3.5" />
                                Хөтөлбөр
                            </p>
                            <p className="mt-0.5 truncate text-sm font-bold">{course.title}</p>
                        </div>
                    </div>

                    <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                            <span>Үзэж дууссан</span>
                            <span className="tabular-nums">
                                {done} / {total}
                            </span>
                        </div>
                        <ProgressBar percent={percent} tone={done === total ? 'emerald' : 'violet'} />
                    </div>

                    {total > 6 && (
                        <div className="relative mt-3">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Хичээл шүүх…"
                                aria-label="Хичээл шүүх"
                                className={cn(FIELD, 'py-1.5 pl-9 pr-8 text-xs')}
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    aria-label="Шүүлтийг арилгах"
                                    className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                >
                                    <X className="size-3" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {items.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-muted-foreground">Илэрц олдсонгүй.</p>
                ) : (
                    <ul className="max-h-[560px] divide-y overflow-y-auto xl:max-h-[calc(100vh-19rem)]">
                        {groups.map((group) => (
                            <li key={group.title ?? "__none"}>
                                {showHeaders && (
                                    <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-card/95 px-4 py-2 backdrop-blur">
                                        <span className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                            {group.title ?? "Бусад хичээл"}
                                        </span>
                                        <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                                            {group.items.length}
                                        </span>
                                    </div>
                                )}

                                <ul className="divide-y">
                                    {group.items.map(({ lesson, number }) => {
                                        const active = lesson.id === currentId;

                                        return (
                                            <li key={lesson.id}>
                                                <Link
                                                    href={`/my/training/lessons/${lesson.id}`}
                                                    aria-current={active ? 'page' : undefined}
                                                    className={cn(
                                                        'relative flex items-start gap-3 px-4 py-3 transition',
                                                        active ? 'bg-violet-50/70 dark:bg-violet-500/10' : 'hover:bg-muted/50',
                                                    )}
                                                >
                                                    {active && (
                                                        <span className="absolute inset-y-0 left-0 w-0.5 bg-violet-600 dark:bg-violet-400" />
                                                    )}

                                                    <span className="mt-0.5 shrink-0">
                                                        {lesson.completed ? (
                                                            <CheckCircle2 className="size-5 text-emerald-500" />
                                                        ) : active ? (
                                                            <PlayCircle className="size-5 text-violet-600 dark:text-violet-400" />
                                                        ) : (
                                                            <Circle className="size-5 text-muted-foreground/40" />
                                                        )}
                                                    </span>

                                                    <span className="min-w-0 flex-1">
                                                        <span
                                                            className={cn(
                                                                'flex gap-1.5 text-sm leading-snug',
                                                                active
                                                                    ? 'font-semibold text-violet-700 dark:text-violet-300'
                                                                    : 'font-medium',
                                                            )}
                                                        >
                                                            <span className="shrink-0 tabular-nums text-muted-foreground">
                                                                {number}.
                                                            </span>
                                                            <span className="line-clamp-2">{lesson.title}</span>
                                                        </span>

                                                        <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                                            <span className="font-mono tabular-nums">{lesson.duration}</span>
                                                            {lesson.is_required && !lesson.completed && (
                                                                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold leading-none text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                                                    Заавал
                                                                </span>
                                                            )}
                                                        </span>

                                                        {lesson.progress > 0 && !lesson.completed && (
                                                            <ProgressBar percent={lesson.progress} className="mt-2 h-1" />
                                                        )}
                                                    </span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </aside>
    );
}

/* ── Цагтай тэмдэглэл ──────────────────────────────────────────────────── */
function NotesPanel({ lessonId, notes, getTime, onJump, canStamp }: {
    lessonId: number;
    notes: Note[];
    getTime: () => number;
    onJump: (seconds: number) => void;
    canStamp: boolean;
}) {
    const [stamp, setStamp] = useState(0);
    const { data, setData, post, processing, reset } = useForm({ position_seconds: 0, body: '' });

    /** Бичиж эхлэхэд тухайн агшныг барьж авна — бичиж дуустал видео урсана. */
    function capture() {
        const at = Math.floor(getTime());
        setStamp(at);
        setData('position_seconds', at);
    }

    function submit(e: FormEvent) {
        e.preventDefault();

        post(`/my/training/lessons/${lessonId}/notes`, {
            preserveScroll: true,
            onSuccess: () => { reset(); setStamp(0); },
        });
    }

    return (
        <div className="space-y-4">
            <form onSubmit={submit} className="rounded-xl border bg-muted/20 p-3">
                <div className="mb-2 flex items-center gap-2">
                    {canStamp ? (
                        <button
                            type="button"
                            onClick={capture}
                            className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/25"
                        >
                            <BookmarkPlus className="size-3.5" />
                            {stamp > 0 ? clock(stamp) : 'Одоогийн агшныг тэмдэглэх'}
                        </button>
                    ) : (
                        <span className="text-xs text-muted-foreground">
                            YouTube хичээл дээр цагийн тэмдэг тавих боломжгүй
                        </span>
                    )}
                </div>

                <textarea
                    value={data.body}
                    onChange={(e) => setData('body', e.target.value)}
                    onFocus={() => canStamp && stamp === 0 && capture()}
                    rows={3}
                    maxLength={2000}
                    placeholder="Энэ хэсэгт юуг тэмдэглэх вэ?"
                    className={cn(FIELD, 'resize-none')}
                />

                <div className="mt-2.5 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground">Тэмдэглэл зөвхөн танд харагдана.</p>
                    <button
                        type="submit"
                        disabled={processing || !data.body.trim()}
                        className={cn(BTN_PRIMARY, 'px-4 py-2 text-xs')}
                    >
                        Хадгалах
                    </button>
                </div>
            </form>

            {notes.length === 0 ? (
                <EmptyState
                    icon={StickyNote}
                    title="Тэмдэглэл алга"
                    description="Видео үзэж байхдаа чухал агшныг тэмдэглэж үлдээгээрэй."
                    className="border-0 py-8"
                />
            ) : (
                <ul className="divide-y rounded-xl border">
                    {notes.map((note) => (
                        <li key={note.id} className="group flex gap-3 p-3">
                            <button
                                type="button"
                                onClick={() => onJump(note.position)}
                                disabled={!canStamp}
                                title="Энэ агшин руу үсрэх"
                                className="h-fit shrink-0 rounded-lg bg-violet-50 px-2 py-1 font-mono text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:pointer-events-none disabled:opacity-60 dark:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/25"
                            >
                                {note.stamp}
                            </button>

                            <p className="min-w-0 flex-1 whitespace-pre-line text-sm leading-relaxed">{note.body}</p>

                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm('Тэмдэглэлээ устгах уу?')) {
                                        router.delete(`/my/training/notes/${note.id}`, { preserveScroll: true });
                                    }
                                }}
                                aria-label="Тэмдэглэл устгах"
                                className="h-fit rounded-lg p-1.5 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-rose-500/10 sm:opacity-0"
                            >
                                <Trash2 className="size-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* ── Сэтгэгдлийн хэсэг ─────────────────────────────────────────────────── */
function CommentSection({ lessonId, comments, reactionTypes, onReact }: {
    lessonId: number;
    comments: Comment[];
    reactionTypes: Record<string, string>;
    onReact: (id: number, type: string) => void;
}) {
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const { data, setData, post, processing, reset } = useForm({ body: '', parent_id: null as number | null });

    function submit(e: FormEvent) {
        e.preventDefault();

        post(`/my/training/lessons/${lessonId}/comments`, {
            preserveScroll: true,
            onSuccess: () => { reset(); setReplyTo(null); },
        });
    }

    return (
        <div className="space-y-5">
            <form onSubmit={submit} className="rounded-xl border bg-muted/20 p-3">
                {replyTo && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg bg-background px-3 py-1.5 text-xs ring-1 ring-inset ring-black/[0.05] dark:ring-white/10">
                        <span className="min-w-0 truncate text-muted-foreground">
                            <span className="font-semibold text-foreground">{replyTo.user_name}</span>-д хариулж байна
                        </span>
                        <button
                            type="button"
                            onClick={() => { setReplyTo(null); setData('parent_id', null); }}
                            className="ml-auto shrink-0 font-semibold text-violet-600 hover:underline dark:text-violet-400"
                        >
                            болих
                        </button>
                    </div>
                )}

                <textarea
                    value={data.body}
                    onChange={(e) => setData('body', e.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder="Асуулт, санал бичих…"
                    className={cn(FIELD, 'resize-none')}
                />

                <div className="mt-2.5 flex justify-end">
                    <button
                        type="submit"
                        disabled={processing || !data.body.trim()}
                        className={cn(BTN_PRIMARY, 'px-4 py-2 text-xs')}
                    >
                        <Send className="size-3.5" />
                        Илгээх
                    </button>
                </div>
            </form>

            {comments.length === 0 ? (
                <EmptyState
                    icon={MessageSquare}
                    title="Сэтгэгдэл алга"
                    description="Эхний сэтгэгдлийг үлдээж, хамт олонтойгоо санал солилцоорой."
                    className="border-0 py-8"
                />
            ) : (
                <ul className="space-y-4">
                    {comments.map((comment) => (
                        <li key={comment.id}>
                            <CommentItem
                                comment={comment}
                                reactionTypes={reactionTypes}
                                onReact={onReact}
                                onReply={() => { setReplyTo(comment); setData('parent_id', comment.id); }}
                            />

                            {comment.replies && comment.replies.length > 0 && (
                                <ul className="mt-3 space-y-3 border-l-2 border-violet-100 pl-4 dark:border-violet-500/20">
                                    {comment.replies.map((reply) => (
                                        <li key={reply.id}>
                                            <CommentItem
                                                comment={reply}
                                                reactionTypes={reactionTypes}
                                                onReact={onReact}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* ── Нэг сэтгэгдэл ─────────────────────────────────────────────────────── */
function CommentItem({ comment, reactionTypes, onReact, onReply }: {
    comment: Comment;
    reactionTypes: Record<string, string>;
    onReact: (id: number, type: string) => void;
    onReply?: () => void;
}) {
    const initials = comment.user_name.trim().charAt(0).toUpperCase() || '?';

    return (
        <div className="group flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white">
                {initials}
            </span>

            <div className="min-w-0 flex-1">
                <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{comment.user_name}</span>
                        {comment.is_pinned && <Chip tone="violet">Онцолсон</Chip>}
                        {comment.is_hidden && <Chip tone="amber">Нуугдсан</Chip>}
                        <span className="text-[11px] text-muted-foreground">{comment.created_at}</span>
                    </div>

                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{comment.body}</p>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {Object.entries(reactionTypes).map(([type, emoji]) => {
                        const count  = comment.reactions[type] ?? 0;
                        const active = comment.my_reaction === type;

                        if (count === 0 && !active) {
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => onReact(comment.id, type)}
                                    className="rounded-full px-1.5 py-0.5 text-sm opacity-40 transition hover:scale-110 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-50 sm:hover:!opacity-100"
                                >
                                    {emoji}
                                </button>
                            );
                        }

                        return (
                            <button
                                key={type}
                                type="button"
                                onClick={() => onReact(comment.id, type)}
                                aria-pressed={active}
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition active:scale-95',
                                    active
                                        ? 'border-violet-300 bg-violet-50 dark:border-violet-500/50 dark:bg-violet-500/15'
                                        : 'border-transparent bg-muted/60 hover:bg-muted',
                                )}
                            >
                                <span>{emoji}</span>
                                <span className="font-semibold tabular-nums">{count}</span>
                            </button>
                        );
                    })}

                    {onReply && (
                        <button
                            type="button"
                            onClick={onReply}
                            className="ml-1 rounded-full px-2 py-0.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            Хариулах
                        </button>
                    )}

                    {comment.is_mine && (
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm('Сэтгэгдлээ устгах уу?')) {
                                    router.delete(`/my/training/comments/${comment.id}`, { preserveScroll: true });
                                }
                            }}
                            className="rounded-full px-2 py-0.5 text-xs font-semibold text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-500/10 sm:opacity-0"
                        >
                            Устгах
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
