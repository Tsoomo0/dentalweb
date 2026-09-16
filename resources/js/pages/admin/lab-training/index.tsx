import LabVideoPreview from '@/components/lab-video-preview';
import LabVideoUploader, { humanSize, type UploadedVideo } from '@/components/lab-video-uploader';
import {
    BTN, Bar, CTA, Check, Empty, FIELD, FILE_INPUT, FieldError, FormActions,
    GLASS, GLASS_CTA, HeroShell, HeroStat, HeroStatGrid, INPUT, IconBtn, LABEL,
    LabModal, Tag, progressTone, AREA,
} from '@/components/lab-admin-ui';
import {
    CategoryModal, CourseModal, MiniStat, Pill, SectionManager, highlight,
    type Course, type Lesson, type Props, type Section,
} from '@/components/lab-course-admin';
import { TONE, categoryIcon, humanMinutes, type Tone } from '@/components/lab-training-ui';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Activity, AlertTriangle, BarChart3, BookOpen, CheckCircle2, ChevronDown, Clock, Edit,
    Eye, FileText, FolderTree, GraduationCap, LayoutGrid, Layers, ListFilter, MessageSquare,
    Play, Plus, Rows3, Search, Sparkles, Trash2, Users, Video, Youtube,
} from 'lucide-react';
import { FormEvent, ReactNode, useMemo, useState } from 'react';

/**
 * Админ тал — лабораторийн видео хичээлийн самбар.
 *
 * ДҮРСЛЭЛИЙН БОДОЛ: хичээл бүр эцсийн дүндээ бичлэг тул хуудас нь хүснэгт
 * биш, кино сангийн дүр төрхтэй. Постер зураг нь гол баримжаа болж, тоо
 * үзүүлэлт нь постерын дээр болон доор нь нэмэлт давхаргаар суудаг. Дэлгэц
 * дүүрэн тоо шаардлагатай үед "Жагсаалт" горим руу шилжинэ.
 *
 * Энэ хуудас ЗӨВХӨН видео сургалтыг харуулна — файлын сургалт
 * /admin/lab-training/documents дээр тусдаа амьдарна.
 */

/**
 * Жагсаалт горимын багана. Толгой, сургалтын мөр, хичээлийн мөр ЯГ ижил grid
 * ашиглана — тиймээс бүх тоо доошоо нэг шулуун дээр эгнэнэ.
 */
const ROW = cn(
    'grid items-center gap-x-3 px-3 sm:px-4',
    'grid-cols-[26px_minmax(0,1fr)_124px]',
    'sm:grid-cols-[26px_minmax(0,1fr)_56px_124px]',
    'lg:grid-cols-[26px_minmax(0,1fr)_56px_66px_62px_104px_124px]',
    'xl:grid-cols-[26px_minmax(0,1fr)_56px_66px_62px_104px_56px_124px]',
);

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Видео сургалт', href: '/admin/lab-training' },
];

type View = 'poster' | 'list';

export default function LabTrainingIndex({ categories, colors, icons, courses, positions, audience }: Props) {
    const [catModal, setCatModal]       = useState(false);
    const [openIds, setOpenIds]         = useState<number[]>(courses.map((c) => c.id));
    const [courseModal, setCourseModal] = useState<Course | 'new' | null>(null);
    const [lessonModal, setLessonModal] = useState<{ courseId: number; lesson: Lesson | null } | null>(null);
    const [playing, setPlaying]         = useState<Lesson | null>(null);
    const [query, setQuery]             = useState('');
    const [catFilter, setCatFilter]     = useState<number | null>(null);
    const [view, setView]               = useState<View>('poster');

    const lessons    = courses.flatMap((c) => c.lessons);
    const published  = lessons.filter((l) => l.is_published).length;
    const withVideo  = lessons.filter((l) => l.has_video).length;
    const openCourse = courses.filter((c) => c.is_published).length;
    const minutes    = Math.round(lessons.reduce((n, l) => n + l.duration_seconds, 0) / 60);
    const comments   = lessons.reduce((n, l) => n + l.comments_count, 0);
    const reactions  = lessons.reduce((n, l) => n + l.reactions_count, 0);
    const overdue    = lessons.filter((l) => l.is_overdue).length;
    const avg        = lessons.length > 0
        ? Math.round(lessons.reduce((n, l) => n + l.avg_progress, 0) / lessons.length)
        : 0;

    /**
     * Хайлт + ангилалын шүүлт. Хичээлийн нэрээр ч таарна — сургалтын нэрийг
     * санахгүй байхад хичээлээ бичээд шууд олно.
     */
    const visible = useMemo(() => {
        const term = query.trim().toLowerCase();

        return courses.filter((c) => {
            if (catFilter !== null && c.category_id !== catFilter) return false;
            if (!term) return true;

            return c.title.toLowerCase().includes(term)
                || c.lessons.some((l) => l.title.toLowerCase().includes(term));
        });
    }, [courses, query, catFilter]);

    const allOpen = visible.length > 0 && visible.every((c) => openIds.includes(c.id));

    const toggle = (id: number) =>
        setOpenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

    function deleteCourse(c: Course) {
        if (confirm(`"${c.title}" сургалтыг бүх хичээл, видеоны хамт устгах уу? Үүнийг буцаах боломжгүй.`)) {
            router.delete(`/admin/lab-training/courses/${c.id}`, { preserveScroll: true });
        }
    }

    function deleteLesson(l: Lesson) {
        if (confirm(`"${l.title}" хичээлийг видеоных нь хамт устгах уу?`)) {
            router.delete(`/admin/lab-training/lessons/${l.id}`, { preserveScroll: true });
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Видео сургалт" />

            {/* ── Кино маягийн толгой ────────────────────────────────────── */}
            <HeroShell>
                <div className="px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/90">
                                <Sparkles className="size-3" />
                                Лабораторийн сургалт
                            </p>

                            <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-[28px]">
                                Видео сургалт
                            </h1>

                            <p className="mt-1 max-w-lg text-xs text-white/55">
                                Бичлэг байршуулж, лаб ажилтнуудын үзэлт, гүйцэтгэлийг нэг дэлгэцээс хянана.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <Link href="/admin/lab-training/documents" className={GLASS}>
                                <FileText className="size-3.5" />
                                Файл сургалт
                            </Link>
                            <Link href="/admin/lab-training/report" className={GLASS}>
                                <BarChart3 className="size-3.5" />
                                Тайлан
                            </Link>
                            <Link href="/admin/lab-training/exams" className={GLASS}>
                                <GraduationCap className="size-3.5" />
                                Шалгалт
                            </Link>
                            <button onClick={() => setCatModal(true)} className={GLASS}>
                                <FolderTree className="size-3.5" />
                                Ангилал
                            </button>
                            <button onClick={() => setCourseModal('new')} className={GLASS_CTA}>
                                <Plus className="size-3.5" />
                                Сургалт нэмэх
                            </button>
                        </div>
                    </div>

                    {/* Үзүүлэлтийн зурвас — толгойн доод ирмэг дээр наалдаж суудаг */}
                    <HeroStatGrid className="mt-5 xl:grid-cols-6">
                        <HeroStat
                            tone="violet" icon={BookOpen}
                            label="Сургалт" value={courses.length} hint={`${openCourse} нээлттэй`}
                        />
                        <HeroStat
                            tone="indigo" icon={Video}
                            label="Хичээл" value={lessons.length} hint={`${published} нийтэлсэн`}
                        />
                        <HeroStat
                            tone="sky" icon={Clock}
                            label="Нийт урт" value={minutes > 0 ? humanMinutes(minutes) : '—'}
                            hint={`${withVideo} видео`}
                        />
                        <HeroStat
                            tone="emerald" icon={Users}
                            label="Хамрах хүрээ" value={audience} hint="идэвхтэй ажилтан"
                        />
                        <HeroStat
                            tone="amber" icon={Activity}
                            label="Дундаж явц" value={`${avg}%`} hint="бүх хичээлээр" percent={avg}
                        />
                        <HeroStat
                            tone="rose" icon={MessageSquare}
                            label="Сэтгэгдэл" value={comments} hint={`${reactions} reaction`}
                        />
                    </HeroStatGrid>
                </div>
            </HeroShell>

            <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
                {/* Хугацаа хоцорсон заавал үзэх хичээл — анзаарагдахгүй өнгөрөх ёсгүй */}
                {overdue > 0 && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                            <strong className="font-bold">{overdue}</strong> заавал үзэх хичээлийн хугацаа дууссан байна.
                        </span>
                        <Link
                            href="/admin/lab-training/report"
                            className="shrink-0 font-semibold underline underline-offset-2"
                        >
                            Тайлан харах
                        </Link>
                    </div>
                )}

                {/* ── Хайлт, шүүлт, харагдах горим ───────────────────────── */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Сургалт, хичээл хайх"
                            className={cn(INPUT, 'h-9 rounded-xl pl-8')}
                        />
                    </div>

                    {categories.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                            <Pill active={catFilter === null} onClick={() => setCatFilter(null)}>
                                <ListFilter className="size-3" />
                                Бүгд
                            </Pill>

                            {categories.map((cat) => (
                                <Pill
                                    key={cat.id}
                                    dot={TONE[cat.color].bar}
                                    active={catFilter === cat.id}
                                    onClick={() => setCatFilter((id) => (id === cat.id ? null : cat.id))}
                                >
                                    {cat.name}
                                    <span className="tabular-nums opacity-50">{cat.courses_count}</span>
                                </Pill>
                            ))}
                        </div>
                    )}

                    <div className="ml-auto flex items-center gap-1.5">
                        {visible.length > 0 && (
                            <button
                                onClick={() => setOpenIds(allOpen ? [] : visible.map((c) => c.id))}
                                className="h-9 shrink-0 rounded-xl px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                {allOpen ? 'Бүгдийг хаах' : 'Бүгдийг нээх'}
                            </button>
                        )}

                        {/* Постер / жагсаалт — нэг өгөгдлийг хоёр өөр нягтралаар */}
                        <div className="inline-flex h-9 shrink-0 rounded-xl border bg-muted/40 p-0.5">
                            {([
                                ['poster', LayoutGrid, 'Постер'],
                                ['list', Rows3, 'Жагсаалт'],
                            ] as const).map(([key, Icon, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setView(key)}
                                    title={label}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-[10px] px-2.5 text-xs font-medium transition',
                                        view === key
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <Icon className="size-3.5" />
                                    <span className="hidden sm:inline">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Сургалтууд ────────────────────────────────────────── */}
                {courses.length === 0 ? (
                    <div className="rounded-2xl border bg-card">
                        <Empty
                            title="Сургалт байхгүй байна"
                            text="Эхлээд сургалт үүсгээд дотор нь видео хичээлүүдээ нэмнэ."
                            action={
                                <button onClick={() => setCourseModal('new')} className={CTA}>
                                    <Plus className="size-3.5" />
                                    Сургалт нэмэх
                                </button>
                            }
                        />
                    </div>
                ) : visible.length === 0 ? (
                    <div className="rounded-2xl border bg-card">
                        <Empty
                            title="Илэрц олдсонгүй"
                            text="Хайлтын үг эсвэл ангилалын шүүлтээ өөрчилж үзнэ үү."
                            action={
                                <button onClick={() => { setQuery(''); setCatFilter(null); }} className={BTN}>
                                    Шүүлтийг цэвэрлэх
                                </button>
                            }
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {visible.map((course) => (
                            <CourseBlock
                                key={course.id}
                                course={course}
                                audience={course.audience ?? audience}
                                view={view}
                                query={query}
                                isOpen={openIds.includes(course.id)}
                                onToggle={() => toggle(course.id)}
                                onEdit={() => setCourseModal(course)}
                                onDelete={() => deleteCourse(course)}
                                onAddLesson={() => setLessonModal({ courseId: course.id, lesson: null })}
                                onEditLesson={(l) => setLessonModal({ courseId: course.id, lesson: l })}
                                onDeleteLesson={deleteLesson}
                                onPlayLesson={setPlaying}
                            />
                        ))}
                    </div>
                )}
            </div>

            {catModal && (
                <CategoryModal
                    categories={categories}
                    colors={colors}
                    icons={icons}
                    onClose={() => setCatModal(false)}
                />
            )}

            {courseModal && (
                <CourseModal
                    course={courseModal === 'new' ? null : courseModal}
                    kind="video"
                    categories={categories}
                    positions={positions}
                    onClose={() => setCourseModal(null)}
                />
            )}

            {lessonModal && (
                <LessonModal
                    courseId={lessonModal.courseId}
                    sections={courses.find((c) => c.id === lessonModal.courseId)?.sections ?? []}
                    lesson={lessonModal.lesson}
                    onClose={() => setLessonModal(null)}
                />
            )}

            {playing && (
                <LabVideoPreview
                    title={playing.title}
                    provider={playing.video_provider}
                    src={lessonVideoSrc(playing)}
                    poster={playing.poster_url}
                    onClose={() => setPlaying(null)}
                />
            )}
        </AppLayout>
    );
}


/* ── Нэг сургалтын блок ────────────────────────────────────────────────── */
function CourseBlock({
    course, audience, view, query, isOpen, onToggle, onEdit, onDelete,
    onAddLesson, onEditLesson, onDeleteLesson, onPlayLesson,
}: {
    course: Course;
    audience: number;
    view: View;
    query: string;
    isOpen: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onAddLesson: () => void;
    onEditLesson: (l: Lesson) => void;
    onDeleteLesson: (l: Lesson) => void;
    onPlayLesson: (l: Lesson) => void;
}) {
    // Ангилал онооогүй сургалт өнгөгүй саарал болж хоцрохгүйн тулд violet авна
    const tone: Tone = course.category_color ?? 'violet';
    const Icon       = categoryIcon(course.category_icon);

    const total     = course.lessons.length;
    const drafts    = course.lessons.filter((l) => !l.is_published).length;
    const minutes   = Math.round(course.lessons.reduce((n, l) => n + l.duration_seconds, 0) / 60);
    const viewers   = course.lessons.reduce((n, l) => n + l.viewers_count, 0);
    const completed = course.lessons.reduce((n, l) => n + l.completed_count, 0);
    const comments  = course.lessons.reduce((n, l) => n + l.comments_count, 0);
    const avg       = total > 0
        ? Math.round(course.lessons.reduce((n, l) => n + l.avg_progress, 0) / total)
        : 0;

    return (
        <section className={cn('overflow-hidden rounded-2xl border bg-card shadow-sm', TONE[tone].edge)}>
            {/* ── Сургалтын толгой ──────────────────────────────────────── */}
            <div className={cn('relative', TONE[tone].surface)}>
                {/* Ангилалын өнгөт тууз — сургалт бүрийг нүдээр тусгаарлана */}
                <span className={cn('absolute inset-y-0 left-0 w-[3px]', TONE[tone].bar)} />

                <div className="flex flex-wrap items-center gap-3 py-3 pl-4 pr-3 sm:pr-4">
                    <button
                        onClick={onToggle}
                        title={isOpen ? 'Хаах' : 'Нээх'}
                        className={cn(
                            'grid size-6 shrink-0 place-items-center rounded-lg transition hover:bg-black/[0.06] dark:hover:bg-white/10',
                            TONE[tone].text,
                        )}
                    >
                        <ChevronDown className={cn('size-4 transition-transform duration-200', !isOpen && '-rotate-90')} />
                    </button>

                    {/* Нүүр зураг — сургалтыг нэрээр нь бус зургаар нь таних */}
                    <button
                        onClick={onToggle}
                        className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10"
                    >
                        {course.cover_url ? (
                            <img src={course.cover_url} alt="" className="size-full object-cover" />
                        ) : (
                            <span className={cn('grid size-full place-items-center', TONE[tone].tile)}>
                                <Icon className="size-5" />
                            </span>
                        )}
                    </button>

                    <button onClick={onToggle} className="min-w-0 flex-1 text-left">
                        <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold tracking-tight">{course.title}</span>
                            {!course.is_published && <Tag tone="amber">Ноорог</Tag>}
                        </span>

                        <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                            {course.category_name && (
                                <span className={cn('flex items-center gap-1 font-semibold', TONE[tone].text)}>
                                    <span className={cn('size-1.5 rounded-full', TONE[tone].bar)} />
                                    {course.category_name}
                                </span>
                            )}
                            <span className="tabular-nums">{total} хичээл</span>
                            {minutes > 0 && <span className="tabular-nums">{humanMinutes(minutes)}</span>}
                            {/* Хэнд харагдахыг нэг харцаар — хязгаарлаагүй бол дүрсгүй */}
                            <span
                                className="flex items-center gap-1 font-medium"
                                title={course.position_names?.length
                                    ? course.position_names.join(', ')
                                    : 'Бүх ажилтанд нээлттэй'}
                            >
                                <Users className="size-3" />
                                {course.position_names?.length
                                    ? course.position_names.slice(0, 2).join(', ')
                                        + (course.position_names.length > 2
                                            ? ' +' + (course.position_names.length - 2)
                                            : '')
                                    : 'Бүх ажилтан'}
                            </span>
                            {drafts > 0 && (
                                <span className="font-medium text-amber-600 dark:text-amber-500">
                                    {drafts} ноорог
                                </span>
                            )}
                        </span>
                    </button>

                    {/* Сургалтын нэгдсэн үзүүлэлт — хичээлүүдийн нийлбэр */}
                    <div className="hidden items-center gap-4 md:flex">
                        <MiniStat icon={Eye} value={viewers} label="үзсэн" />
                        <MiniStat icon={CheckCircle2} value={completed} label="дууссан" tone="emerald" />
                        <MiniStat icon={MessageSquare} value={comments} label="сэтгэгдэл" />

                        <div className="w-28">
                            <Bar percent={avg} />
                        </div>
                    </div>

                    <span className="flex items-center gap-0.5">
                        <IconBtn icon={Plus} label="Хичээл нэмэх" onClick={onAddLesson} />
                        <IconBtn icon={Edit} label="Сургалт засах" onClick={onEdit} />
                        <IconBtn icon={Trash2} label="Сургалт устгах" danger onClick={onDelete} />
                    </span>
                </div>
            </div>

            {isOpen && (
                <>
                    <SectionManager course={course} />

                    {course.lessons.length === 0 ? (
                        <div className="flex flex-col items-center gap-2.5 px-6 py-10 text-center">
                            <span className="grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
                                <Video className="size-5" />
                            </span>
                            <p className="text-xs text-muted-foreground">Энэ сургалтад хичээл нэмээгүй байна.</p>
                            <button onClick={onAddLesson} className={CTA}>
                                <Plus className="size-3.5" />
                                Хичээл нэмэх
                            </button>
                        </div>
                    ) : view === 'poster' ? (
                        <div className="grid grid-cols-1 gap-3.5 p-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                            {course.lessons.map((lesson, i) => (
                                <LessonCard
                                    key={lesson.id}
                                    lesson={lesson}
                                    index={i + 1}
                                    tone={tone}
                                    audience={audience}
                                    query={query}
                                    sectionTitle={course.sections.find((s) => s.id === lesson.section_id)?.title ?? null}
                                    onEdit={() => onEditLesson(lesson)}
                                    onDelete={() => onDeleteLesson(lesson)}
                                    onPlay={() => onPlayLesson(lesson)}
                                />
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className={cn(
                                ROW,
                                'h-9 border-t bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
                            )}>
                                <span />
                                <span>Хичээл</span>
                                <span className="hidden text-right sm:block">Урт</span>
                                <span className="hidden text-right lg:block">Үзсэн</span>
                                <span className="hidden text-right lg:block">Дууссан</span>
                                <span className="hidden lg:block">Явц</span>
                                <span className="hidden text-right xl:block">Сэтгэгдэл</span>
                                <span />
                            </div>

                            {course.lessons.map((lesson, i) => (
                                <LessonRow
                                    key={lesson.id}
                                    lesson={lesson}
                                    index={i + 1}
                                    audience={audience}
                                    sectionTitle={course.sections.find((s) => s.id === lesson.section_id)?.title ?? null}
                                    onEdit={() => onEditLesson(lesson)}
                                    onDelete={() => onDeleteLesson(lesson)}
                                    onPlay={() => onPlayLesson(lesson)}
                                />
                            ))}
                        </>
                    )}
                </>
            )}
        </section>
    );
}

/* ── Хичээлийн постер карт ─────────────────────────────────────────────── */
/**
 * Гол гадаргуу нь 16:9 постер. Дээр нь тоглуулах товлол, доод ирмэг дээр нь
 * дундаж явцын шугам суудаг — өөрөөр хэлбэл видео тоглуулагчийн scrubber
 * шиг харагдана. Хулганаа аваачихад л засах/устгах товч гарч ирнэ, тиймээс
 * тайван байхдаа хуудас цэвэрхэн хэвээр үлдэнэ.
 */
function LessonCard({ lesson, index, tone, audience, query, sectionTitle, onEdit, onDelete, onPlay }: {
    lesson: Lesson;
    index: number;
    tone: Tone;
    audience: number;
    query: string;
    sectionTitle: string | null;
    onEdit: () => void;
    onDelete: () => void;
    onPlay: () => void;
}) {
    const progress = Math.min(100, Math.max(0, lesson.avg_progress));
    const pTone    = progressTone(progress);

    return (
        <article className="group/card relative">
            <div className={cn(
                'relative aspect-video overflow-hidden rounded-xl bg-neutral-950 ring-1 ring-black/[0.06]',
                'transition-shadow duration-300 group-hover/card:shadow-xl group-hover/card:shadow-black/15',
                'dark:ring-white/10 dark:group-hover/card:shadow-black/50',
                !lesson.is_published && 'opacity-[0.72] saturate-[0.6] group-hover/card:opacity-100 group-hover/card:saturate-100',
            )}>
                {lesson.poster_url ? (
                    <img
                        src={lesson.poster_url}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.06]"
                    />
                ) : (
                    /* Постергүй үед ч гоё харагдах ёстой — өнгөт градиент дэвсгэр */
                    <span className={cn(
                        'grid size-full place-items-center bg-gradient-to-br',
                        tone === 'slate'
                            ? 'from-neutral-800 to-neutral-950'
                            : 'from-neutral-900 via-neutral-950 to-black',
                    )}>
                        {lesson.video_provider === 'youtube'
                            ? <Youtube className="size-8 text-white/15" />
                            : <Video className="size-8 text-white/10" />}
                    </span>
                )}

                {/* Доод хэсгийн бараан хөшиг — цагаан бичиг ямар ч зураг дээр уншигдана */}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/25" />

                {/* Тоглуулах гадаргуу — картын ихэнхийг эзэлнэ */}
                <button
                    type="button"
                    onClick={onPlay}
                    disabled={!lesson.has_video}
                    title={lesson.has_video ? 'Бичлэгийг үзэх' : 'Видео байхгүй'}
                    className="absolute inset-0 grid place-items-center disabled:cursor-not-allowed"
                >
                    {lesson.has_video && (
                        <span className={cn(
                            'grid size-11 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md',
                            'scale-90 opacity-0 transition-all duration-300 ease-out',
                            'group-hover/card:scale-100 group-hover/card:bg-white group-hover/card:text-neutral-950 group-hover/card:opacity-100',
                        )}>
                            <Play className="size-4 translate-x-[1px] fill-current" />
                        </span>
                    )}
                </button>

                {/* Зүүн дээд — дугаар ба төлөв */}
                <span className="pointer-events-none absolute left-2 top-2 flex flex-wrap items-center gap-1">
                    <span className="rounded-md bg-black/55 px-1.5 text-[10px] font-bold leading-[18px] tabular-nums text-white/80 backdrop-blur-sm">
                        {index}
                    </span>
                    {!lesson.is_published && <PosterTag>Ноорог</PosterTag>}
                    {!lesson.has_video && <PosterTag tone="amber">Видеогүй</PosterTag>}
                    {lesson.is_required && (
                        <PosterTag tone={lesson.is_overdue ? 'rose' : 'violet'}>
                            {lesson.is_overdue ? 'Хоцорсон' : 'Заавал'}
                        </PosterTag>
                    )}
                </span>

                {/* Баруун дээд — үйлдлүүд. Хулгана ойртоход л гарна */}
                <span className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 focus-within:opacity-100">
                    <GlassIcon icon={BarChart3} label="Дэлгэрэнгүй" href={`/admin/lab-training/report/lessons/${lesson.id}`} />
                    <GlassIcon icon={Edit} label="Засах" onClick={onEdit} />
                    <GlassIcon icon={Trash2} label="Устгах" danger onClick={onDelete} />
                </span>

                {/* Баруун доод — үргэлжлэх хугацаа */}
                {lesson.duration_seconds > 0 && (
                    <span className="pointer-events-none absolute bottom-2.5 right-2 rounded-md bg-black/70 px-1.5 text-[10px] font-bold leading-[18px] tabular-nums text-white backdrop-blur-sm">
                        {lesson.duration_label}
                    </span>
                )}

                {/* Хамгийн доод ирмэг — дундаж явц. Тоглуулагчийн scrubber мэдрэмж */}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-white/15">
                    <span
                        className={cn('block h-full transition-[width] duration-700 ease-out', TONE[pTone].bar)}
                        style={{ width: `${progress}%` }}
                    />
                </span>
            </div>

            {/* ── Постерын доорх мэдээлэл ───────────────────────────────── */}
            <div className="px-0.5 pt-2">
                <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug" title={lesson.title}>
                    {highlight(lesson.title, query)}
                </h3>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 tabular-nums" title="Үзсэн ажилтан">
                        <Eye className="size-3" />
                        {lesson.viewers_count}
                        <span className="opacity-50">/{audience}</span>
                    </span>

                    <span
                        className={cn(
                            'flex items-center gap-1 tabular-nums',
                            lesson.completed_count > 0 && 'font-semibold text-emerald-600 dark:text-emerald-400',
                        )}
                        title="Дуусгасан"
                    >
                        <CheckCircle2 className="size-3" />
                        {lesson.completed_count}
                    </span>

                    {lesson.comments_count > 0 && (
                        <span className="flex items-center gap-1 tabular-nums" title="Сэтгэгдэл">
                            <MessageSquare className="size-3" />
                            {lesson.comments_count}
                        </span>
                    )}

                    {lesson.attachments.length > 0 && (
                        <span className="flex items-center gap-1 tabular-nums" title="Хавсралт">
                            <FileText className="size-3" />
                            {lesson.attachments.length}
                        </span>
                    )}

                    <span className={cn('ml-auto font-semibold tabular-nums', TONE[pTone].text)}>
                        {progress}%
                    </span>
                </div>

                {(sectionTitle || lesson.due_at) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground/80">
                        {sectionTitle && (
                            <span className="flex items-center gap-1 truncate">
                                <Layers className="size-3 shrink-0" />
                                {sectionTitle}
                            </span>
                        )}
                        {lesson.due_at && (
                            <span className={cn('tabular-nums', lesson.is_overdue && 'font-semibold text-rose-600 dark:text-rose-400')}>
                                {lesson.due_at.slice(0, 10)}
                            </span>
                        )}
                        {lesson.file_size > 0 && (
                            <span className="tabular-nums">{humanSize(lesson.file_size)}</span>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}

/** Постер дээр суух шошго — хар зураг дээр ч, цайвар зураг дээр ч уншигдана. */
function PosterTag({ tone, children }: { tone?: Tone; children: ReactNode }) {
    const accent: Record<string, string> = {
        amber: 'bg-amber-400/90 text-amber-950',
        rose: 'bg-rose-500/90 text-white',
        violet: 'bg-violet-500/90 text-white',
    };

    return (
        <span className={cn(
            'rounded-md px-1.5 text-[10px] font-bold leading-[18px] backdrop-blur-sm',
            tone ? accent[tone] ?? 'bg-black/55 text-white/85' : 'bg-black/55 text-white/85',
        )}>
            {children}
        </span>
    );
}

/** Постер дээрх шилэн үйлдлийн товч. */
function GlassIcon({ icon: Icon, label, onClick, href, danger }: {
    icon: typeof Edit; label: string; onClick?: () => void; href?: string; danger?: boolean;
}) {
    const cls = cn(
        'grid size-7 place-items-center rounded-lg border border-white/20 bg-black/50 text-white/85 backdrop-blur-md transition',
        'hover:bg-black/70 hover:text-white active:scale-95',
        danger && 'hover:border-rose-400/40 hover:bg-rose-600/80',
    );

    if (href) {
        return (
            <Link href={href} className={cls} title={label}>
                <Icon className="size-3.5" />
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} className={cls} title={label}>
            <Icon className="size-3.5" />
        </button>
    );
}
/* ── Жагсаалт горимын мөр ──────────────────────────────────────────────── */
function LessonRow({ lesson, index, audience, sectionTitle, onEdit, onDelete, onPlay }: {
    lesson: Lesson; index: number; audience: number; sectionTitle: string | null;
    onEdit: () => void; onDelete: () => void; onPlay: () => void;
}) {
    return (
        <div className={cn(ROW, 'h-14 border-t transition-colors hover:bg-muted/40')}>
            <span className="text-right text-[11px] tabular-nums text-muted-foreground/60">{index}</span>

            <div className="flex min-w-0 items-center gap-2.5">
                {/* Зурган дээр дарахад бичлэг тоглоно */}
                <button
                    type="button"
                    onClick={onPlay}
                    disabled={!lesson.has_video}
                    title={lesson.has_video ? 'Бичлэгийг үзэх' : 'Видео байхгүй'}
                    className="group relative h-9 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-950 ring-1 ring-black/5 disabled:cursor-not-allowed dark:ring-white/10"
                >
                    {lesson.poster_url ? (
                        <img src={lesson.poster_url} alt="" loading="lazy" className="size-full object-cover" />
                    ) : (
                        <span className="grid size-full place-items-center">
                            {lesson.video_provider === 'youtube'
                                ? <Youtube className="size-3.5 text-white/35" />
                                : <Video className="size-3.5 text-white/20" />}
                        </span>
                    )}

                    {lesson.has_video && (
                        <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <Play className="size-3.5 fill-white text-white" />
                        </span>
                    )}

                    {/* Мөрөнд ч явц харагдана — постер горимтой ижил хэл */}
                    {lesson.avg_progress > 0 && (
                        <span className="absolute inset-x-0 bottom-0 h-[2px] bg-white/20">
                            <span
                                className={cn('block h-full', TONE[progressTone(lesson.avg_progress)].bar)}
                                style={{ width: `${Math.min(100, lesson.avg_progress)}%` }}
                            />
                        </span>
                    )}
                </button>

                <div className="min-w-0">
                    <p className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium">{lesson.title}</span>
                        {!lesson.is_published && <Tag tone="amber">Ноорог</Tag>}
                        {!lesson.has_video && <Tag tone="amber">Видеогүй</Tag>}
                        {lesson.is_required && (
                            <Tag tone={lesson.is_overdue ? 'rose' : 'violet'}>
                                {lesson.is_overdue ? 'Хоцорсон' : 'Заавал'}
                            </Tag>
                        )}
                    </p>

                    <p className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-muted-foreground">
                        {sectionTitle && (
                            <span className="flex items-center gap-1">
                                <Layers className="size-3" />
                                {sectionTitle}
                            </span>
                        )}
                        {lesson.file_size > 0 && <span className="tabular-nums">{humanSize(lesson.file_size)}</span>}
                        {lesson.attachments.length > 0 && (
                            <span className="flex items-center gap-1">
                                <FileText className="size-3" />
                                {lesson.attachments.length}
                            </span>
                        )}
                        {lesson.due_at && (
                            <span className={cn(lesson.is_overdue && 'text-rose-600 dark:text-rose-400')}>
                                {lesson.due_at.slice(0, 10)}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            <span className="hidden text-right text-[11px] tabular-nums text-muted-foreground sm:block">
                {lesson.duration_seconds > 0 ? lesson.duration_label : '—'}
            </span>
            <span className={cn(
                'hidden text-right text-xs tabular-nums lg:block',
                lesson.viewers_count === 0 && 'text-muted-foreground/50',
            )}>
                {lesson.viewers_count}
                <span className="text-muted-foreground/60">/{audience}</span>
            </span>
            <span className={cn(
                'hidden text-right text-xs tabular-nums lg:block',
                lesson.completed_count > 0
                    ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground/50',
            )}>
                {lesson.completed_count}
            </span>
            <Bar percent={lesson.avg_progress} className="hidden lg:flex" />
            <span className={cn(
                'hidden text-right text-xs tabular-nums xl:block',
                lesson.comments_count === 0 && 'text-muted-foreground/50',
            )}>
                {lesson.comments_count}
            </span>

            <span className="flex items-center justify-end gap-0.5">
                <IconBtn
                    icon={Play}
                    label={lesson.has_video ? 'Бичлэгийг үзэх' : 'Видео байхгүй'}
                    onClick={onPlay}
                    disabled={!lesson.has_video}
                />
                <IconBtn icon={BarChart3} label="Дэлгэрэнгүй" href={`/admin/lab-training/report/lessons/${lesson.id}`} />
                <IconBtn icon={Edit} label="Засах" onClick={onEdit} />
                <IconBtn icon={Trash2} label="Устгах" danger onClick={onDelete} />
            </span>
        </div>
    );
}

/* ── Туслах хөрвүүлэлтүүд ──────────────────────────────────────────────── */

/** YouTube-ийн холбоос эсвэл ID-аас 11 тэмдэгтийн video ID-г салгана. */
function youtubeId(input: string): string | null {
    const text = input.trim();

    if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;

    const match = text.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/,
    );

    return match ? match[1] : null;
}

/** Хадгалсан хичээлийг тоглуулах эх сурвалж. */
function lessonVideoSrc(lesson: Lesson): string {
    return lesson.video_provider === 'youtube'
        ? lesson.video_ref ?? ''
        : `/admin/lab-training/lessons/${lesson.id}/stream`;
}

/** "12:30" эсвэл "750" → 750 секунд. Таних боломжгүй бол 0. */
function parseDuration(text: string): number {
    const parts = text.trim().split(':').map((p) => Number(p.trim()));

    if (parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;

    if (parts.length === 1) return Math.round(parts[0]);
    if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
    if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);

    return 0;
}

function secondsToText(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${String(s).padStart(2, '0')}`;
}

/* ── Видео хичээл нэмэх / засах ────────────────────────────────────────── */
function LessonModal({ courseId, sections, lesson, onClose }: {
    courseId: number; sections: Section[]; lesson: Lesson | null; onClose: () => void;
}) {
    const { data, setData, post, processing, errors } = useForm({
        lab_course_id: courseId,
        lab_section_id: lesson?.section_id ?? '',
        title: lesson?.title ?? '',
        description: lesson?.description ?? '',
        video_provider: (lesson?.video_provider === 'youtube' ? 'youtube' : 'local') as 'local' | 'youtube',
        video_ref: lesson?.video_ref ?? '',
        video_path: '',
        checksum: '',
        file_size: 0,
        duration_seconds: lesson?.duration_seconds ?? 0,
        poster: null as File | null,
        attachments: [] as File[],
        is_published: lesson?.is_published ?? false,
        is_required: lesson?.is_required ?? false,
        due_at: lesson?.due_at ?? '',
    });

    // Урьдчилан үзэх цонх: 'saved' — хадгалсан видео, 'upload' — сая байршуулсан
    const [preview, setPreview] = useState<'saved' | 'upload' | null>(null);

    // YouTube-д уртыг гараар оруулах талбар — "12:30" хэлбэрээр
    const [durationText, setDurationText] = useState(
        lesson?.duration_seconds ? secondsToText(lesson.duration_seconds) : '',
    );

    // Байршуулалт дуусмагц серверээс ирсэн зам, урт, poster-ыг форм руу тавина
    function handleUploaded(video: UploadedVideo) {
        setData((prev) => ({
            ...prev,
            video_path: video.path,
            checksum: video.checksum,
            file_size: video.size,
            duration_seconds: video.duration || prev.duration_seconds,
            poster: video.poster
                ? new File([video.poster], 'poster.jpg', { type: 'image/jpeg' })
                : prev.poster,
        }));
    }

    function clearUploaded() {
        setData((prev) => ({ ...prev, video_path: '', checksum: '', file_size: 0 }));
        setPreview((p) => (p === 'upload' ? null : p));
    }

    function submit(e: FormEvent) {
        e.preventDefault();

        post(lesson ? `/admin/lab-training/lessons/${lesson.id}` : '/admin/lab-training/lessons', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    // Шинэ хичээлд бичлэг заавал байх ёстой — YouTube бол холбоос нь хангалттай
    const needsVideo = !lesson && data.video_provider === 'local' && !data.video_path;

    return (
        <LabModal
            size="lg"
            title={lesson ? 'Видео хичээл засах' : 'Шинэ видео хичээл'}
            description={lesson ? lesson.title : 'Видеог байршуулаад нийтлэхээсээ өмнө шалгаж болно.'}
            onClose={onClose}
        >
            <form onSubmit={submit} className="space-y-3.5">
                <div className={cn('gap-3.5', sections.length > 0 && 'grid sm:grid-cols-[1fr_180px]')}>
                    <div>
                        <label className={LABEL}>Гарчиг</label>
                        <input
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className={FIELD}
                            placeholder="Жишээ: Метал каркасын бэлдэц"
                            autoFocus
                        />
                        <FieldError message={errors.title} />
                    </div>

                    {sections.length > 0 && (
                        <div>
                            <label className={LABEL}>Бүлэг</label>
                            <select
                                value={data.lab_section_id}
                                onChange={(e) => setData('lab_section_id', e.target.value)}
                                className={FIELD}
                            >
                                <option value="">— Бүлэггүй —</option>
                                {sections.map((sec) => (
                                    <option key={sec.id} value={sec.id}>{sec.title}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div>
                    <label className={LABEL}>Тайлбар</label>
                    <textarea
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        rows={2}
                        className={AREA}
                    />
                </div>

                {/* Видеоны эх сурвалж */}
                <div>
                    <label className={LABEL}>Видео</label>

                    <div className="mb-2.5 inline-flex h-8 rounded-lg border bg-muted/40 p-0.5">
                        {(['local', 'youtube'] as const).map((provider) => (
                            <button
                                key={provider}
                                type="button"
                                onClick={() => setData('video_provider', provider)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-[6px] px-3 text-xs font-medium transition',
                                    data.video_provider === provider
                                        ? 'bg-card text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {provider === 'local' ? <Video className="size-3.5" /> : <Youtube className="size-3.5" />}
                                {provider === 'local' ? 'Файл' : 'YouTube'}
                            </button>
                        ))}
                    </div>

                    {data.video_provider === 'local' ? (
                        <>
                            <LabVideoUploader onDone={handleUploaded} onClear={clearUploaded} disabled={processing} />

                            {/* Хадгалахаас өмнө сая байршуулсан файлаа шалгах */}
                            {data.video_path && (
                                <button type="button" onClick={() => setPreview('upload')} className={cn(BTN, 'mt-2')}>
                                    <Play className="size-3.5" />
                                    Байршуулсан бичлэгийг шалгах
                                </button>
                            )}

                            {lesson?.has_video && !data.video_path && (
                                <div className="mt-2 flex flex-wrap items-center gap-2.5">
                                    <button type="button" onClick={() => setPreview('saved')} className={BTN}>
                                        <Play className="size-3.5" />
                                        Одоогийн бичлэгийг үзэх
                                    </button>
                                    <p className="text-[11px] text-muted-foreground">
                                        Солих бол шинэ файл сонгоно уу.
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="grid gap-3.5 sm:grid-cols-[1fr_140px]">
                            <div>
                                <input
                                    value={data.video_ref}
                                    onChange={(e) => setData('video_ref', e.target.value)}
                                    className={FIELD}
                                    placeholder="https://youtu.be/… эсвэл video ID"
                                />
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    YouTube дээр "Unlisted" болгосон бичлэгийн холбоос.
                                </p>

                                {youtubeId(data.video_ref) && (
                                    <button type="button" onClick={() => setPreview('upload')} className={cn(BTN, 'mt-2')}>
                                        <Play className="size-3.5" />
                                        Холбоосыг шалгах
                                    </button>
                                )}
                            </div>

                            <div>
                                <input
                                    value={durationText}
                                    onChange={(e) => {
                                        setDurationText(e.target.value);
                                        setData('duration_seconds', parseDuration(e.target.value));
                                    }}
                                    placeholder="Урт — 12:30"
                                    className={FIELD}
                                />
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    Хоосон орхивол эхний үзэлтээр бүртгэгдэнэ.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Хавсралт */}
                <div>
                    <label className={LABEL}>Хавсралт (PDF, зураг)</label>
                    <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,image/*"
                        onChange={(e) => setData('attachments', Array.from(e.target.files ?? []))}
                        className={FILE_INPUT}
                    />

                    {lesson && lesson.attachments.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {lesson.attachments.map((f) => (
                                <li key={f.path} className="flex h-8 items-center gap-2 rounded-lg border px-2.5 text-[11px]">
                                    <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                                    <span className="shrink-0 tabular-nums text-muted-foreground">{humanSize(f.size)}</span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.post(
                                                `/admin/lab-training/lessons/${lesson.id}/attachment/delete`,
                                                { path: f.path },
                                                { preserveScroll: true },
                                            )
                                        }
                                        className="shrink-0 font-medium text-rose-600 hover:underline dark:text-rose-400"
                                    >
                                        Устгах
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                    <Check
                        checked={data.is_published}
                        onChange={(v) => setData('is_published', v)}
                        label="Нийтлэх"
                        hint="Лаб ажилтнуудад харагдана."
                    />
                    <Check
                        checked={data.is_required}
                        onChange={(v) => setData('is_required', v)}
                        label="Заавал үзэх"
                        hint="Тайланд тусад нь хянагдана."
                    />
                </div>

                {data.is_required && (
                    <div>
                        <label className={LABEL}>Үзэж дуусгах хугацаа</label>
                        <input
                            type="datetime-local"
                            value={data.due_at}
                            onChange={(e) => setData('due_at', e.target.value)}
                            className={FIELD}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            Хоосон орхивол хугацаагүй. Хоцорсон ажилтан тайланд улаанаар харагдана.
                        </p>
                    </div>
                )}

                <FormActions
                    submitLabel={lesson ? 'Хадгалах' : 'Нэмэх'}
                    disabled={processing || !data.title || needsVideo}
                    onCancel={onClose}
                />

                {needsVideo && (
                    <p className="text-right text-[11px] text-muted-foreground">
                        Видео байршуулж дуусахыг хүлээнэ үү.
                    </p>
                )}
            </form>

            {preview && (
                <LabVideoPreview
                    title={data.title || 'Урьдчилан үзэх'}
                    provider={data.video_provider}
                    poster={preview === 'saved' ? lesson?.poster_url : null}
                    src={
                        data.video_provider === 'youtube'
                            ? youtubeId(data.video_ref) ?? ''
                            : preview === 'upload'
                                ? `/admin/lab-training/preview?path=${encodeURIComponent(data.video_path)}`
                                : `/admin/lab-training/lessons/${lesson?.id}/stream`
                    }
                    onClose={() => setPreview(null)}
                />
            )}
        </LabModal>
    );
}

