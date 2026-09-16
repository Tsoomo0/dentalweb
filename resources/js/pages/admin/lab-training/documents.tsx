import {
    AREA, BTN, Bar, CTA, Check, Empty, FIELD, FILE_INPUT, FieldError, FormActions,
    GLASS, GLASS_CTA, HeroShell, HeroStat, HeroStatGrid, INPUT, IconBtn, LABEL,
    LabModal, Tag, progressTone,
} from '@/components/lab-admin-ui';
import {
    CategoryModal, CourseModal, MiniStat, Pill, SectionManager, highlight,
    type Course, type Lesson, type Props, type Section,
} from '@/components/lab-course-admin';
import { TONE, categoryIcon, humanSize, type Tone } from '@/components/lab-training-ui';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Activity, AlertTriangle, BarChart3, BookOpen, CheckCircle2, ChevronDown, Clock, Edit,
    Eye, FileSpreadsheet, FileText, FileType2, FolderTree, GraduationCap, Layers,
    ListFilter, Loader2, MessageSquare, Plus, RefreshCw, Search, Sparkles, Trash2,
    Users, Video,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

/**
 * Админ тал — лабораторийн ФАЙЛ сургалтын самбар.
 *
 * ДҮРСЛЭЛИЙН БОДОЛ: баримт хичээлд постер гэж байхгүй, урт нь секунд биш
 * ХУУДАС. Тиймээс энэ хуудас видеоныхоос өөр: кино сан биш, бичиг баримтын
 * шүүгээ шиг нягт мөрөөр эгнэнэ. Мөр бүр дээр хамгийн түрүүнд ХӨРВҮҮЛЭЛТИЙН
 * ТӨЛӨВ харагдана — PPT, DOCX нь сервер дээр PDF болж дуустал ажилтанд
 * харагдахгүй тул админд энэ л хамгийн чухал мэдээлэл.
 *
 * Видео сургалт /admin/lab-training дээр тусдаа амьдарна.
 */

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Файл сургалт', href: '/admin/lab-training/documents' },
];

/**
 * Жагсаалтын багана. Толгой ба хичээлийн мөр ЯГ ижил grid ашиглана —
 * ингэснээр бүх тоо доошоо нэг шулуун дээр эгнэнэ.
 */
const ROW = cn(
    'grid items-center gap-x-3 px-3 sm:px-4',
    'grid-cols-[26px_minmax(0,1fr)_92px]',
    'sm:grid-cols-[26px_minmax(0,1fr)_64px_92px]',
    'lg:grid-cols-[26px_minmax(0,1fr)_64px_70px_62px_62px_104px_92px]',
);

export default function LabDocumentTraining({ categories, colors, icons, courses, positions, audience }: Props) {
    const [catModal, setCatModal]       = useState(false);
    const [openIds, setOpenIds]         = useState<number[]>(courses.map((c) => c.id));
    const [courseModal, setCourseModal] = useState<Course | 'new' | null>(null);
    const [lessonModal, setLessonModal] = useState<{ courseId: number; lesson: Lesson | null } | null>(null);
    const [query, setQuery]             = useState('');
    const [catFilter, setCatFilter]     = useState<number | null>(null);

    const lessons   = courses.flatMap((c) => c.lessons);
    const published = lessons.filter((l) => l.is_published).length;
    const pages     = lessons.reduce((n, l) => n + l.page_count, 0);
    const bytes     = lessons.reduce((n, l) => n + l.file_size, 0);
    const overdue   = lessons.filter((l) => l.is_overdue).length;
    const openCourse = courses.filter((c) => c.is_published).length;

    // Хөрвүүлэлт бол энэ хуудасны цорын ганц "эвдэрч болох" хэсэг тул
    // толгой дээрээ тусад нь тоологдоно
    const pending = lessons.filter((l) => l.doc_status === 'pending').length;
    const failed  = lessons.filter((l) => l.doc_status === 'failed').length;

    const avg = lessons.length > 0
        ? Math.round(lessons.reduce((n, l) => n + l.avg_progress, 0) / lessons.length)
        : 0;

    /** Хайлт + ангилалын шүүлт. Хичээлийн нэр, эх файлын нэрээр ч таарна. */
    const visible = useMemo(() => {
        const term = query.trim().toLowerCase();

        return courses.filter((c) => {
            if (catFilter !== null && c.category_id !== catFilter) return false;
            if (!term) return true;

            return c.title.toLowerCase().includes(term)
                || c.lessons.some((l) => l.title.toLowerCase().includes(term)
                    || (l.doc_source_name ?? '').toLowerCase().includes(term));
        });
    }, [courses, query, catFilter]);

    const allOpen = visible.length > 0 && visible.every((c) => openIds.includes(c.id));

    const toggle = (id: number) =>
        setOpenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

    function deleteCourse(c: Course) {
        if (confirm(`"${c.title}" сургалтыг бүх хичээл, файлынх нь хамт устгах уу? Үүнийг буцаах боломжгүй.`)) {
            router.delete(`/admin/lab-training/courses/${c.id}`, { preserveScroll: true });
        }
    }

    function deleteLesson(l: Lesson) {
        if (confirm(`"${l.title}" хичээлийг баримтынх нь хамт устгах уу?`)) {
            router.delete(`/admin/lab-training/lessons/${l.id}`, { preserveScroll: true });
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Файл сургалт" />

            <HeroShell>
                <div className="px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300/90">
                                <Sparkles className="size-3" />
                                Лабораторийн сургалт
                            </p>

                            <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-[28px]">
                                Файл сургалт
                            </h1>

                            <p className="mt-1 max-w-lg text-xs text-white/55">
                                PDF, PPT, DOCX баримтыг хичээл болгож, уншсан хуудсаар нь гүйцэтгэлийг хэмжинэ.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <Link href="/admin/lab-training" className={GLASS}>
                                <Video className="size-3.5" />
                                Видео сургалт
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

                    <HeroStatGrid className="mt-5 xl:grid-cols-6">
                        <HeroStat
                            tone="sky" icon={BookOpen}
                            label="Сургалт" value={courses.length} hint={`${openCourse} нээлттэй`}
                        />
                        <HeroStat
                            tone="indigo" icon={FileText}
                            label="Баримт" value={lessons.length} hint={`${published} нийтэлсэн`}
                        />
                        <HeroStat
                            tone="violet" icon={Layers}
                            label="Нийт хуудас" value={pages || '—'} hint={humanSize(bytes)}
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
                            tone={failed > 0 ? 'rose' : 'slate'} icon={RefreshCw}
                            label="Хөрвүүлэлт"
                            value={failed > 0 ? failed : pending > 0 ? pending : '—'}
                            hint={failed > 0 ? 'амжилтгүй' : pending > 0 ? 'хүлээгдэж байна' : 'бүгд бэлэн'}
                        />
                    </HeroStatGrid>
                </div>
            </HeroShell>

            <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
                {/* Хөрвүүлэлт унасан баримт — ажилтанд ОГТ харагдахгүй байгаа гэсэн үг */}
                {failed > 0 && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                            <strong className="font-bold">{failed}</strong> баримтын хөрвүүлэлт амжилтгүй болсон тул
                            ажилтанд харагдахгүй байна. Мөрөн дээрх "Дахин оролдох"-ыг дарна уу.
                        </span>
                    </div>
                )}

                {overdue > 0 && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                        <Clock className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                            <strong className="font-bold">{overdue}</strong> заавал унших баримтын хугацаа дууссан байна.
                        </span>
                        <Link
                            href="/admin/lab-training/report"
                            className="shrink-0 font-semibold underline underline-offset-2"
                        >
                            Тайлан харах
                        </Link>
                    </div>
                )}

                {/* ── Хайлт, шүүлт ──────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Сургалт, баримт, файлын нэр"
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

                    {visible.length > 0 && (
                        <button
                            onClick={() => setOpenIds(allOpen ? [] : visible.map((c) => c.id))}
                            className="ml-auto h-9 shrink-0 rounded-xl px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            {allOpen ? 'Бүгдийг хаах' : 'Бүгдийг нээх'}
                        </button>
                    )}
                </div>

                {/* ── Сургалтууд ────────────────────────────────────────── */}
                {courses.length === 0 ? (
                    <div className="rounded-2xl border bg-card">
                        <Empty
                            title="Файл сургалт байхгүй байна"
                            text="Эхлээд сургалт үүсгээд дотор нь PDF, PPT, DOCX баримтуудаа хичээл болгож нэмнэ."
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
                                query={query}
                                isOpen={openIds.includes(course.id)}
                                onToggle={() => toggle(course.id)}
                                onEdit={() => setCourseModal(course)}
                                onDelete={() => deleteCourse(course)}
                                onAddLesson={() => setLessonModal({ courseId: course.id, lesson: null })}
                                onEditLesson={(l) => setLessonModal({ courseId: course.id, lesson: l })}
                                onDeleteLesson={deleteLesson}
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
                    kind="document"
                    categories={categories}
                    positions={positions}
                    onClose={() => setCourseModal(null)}
                />
            )}

            {lessonModal && (
                <DocumentModal
                    courseId={lessonModal.courseId}
                    sections={courses.find((c) => c.id === lessonModal.courseId)?.sections ?? []}
                    lesson={lessonModal.lesson}
                    onClose={() => setLessonModal(null)}
                />
            )}
        </AppLayout>
    );
}

/* ── Нэг сургалтын блок ────────────────────────────────────────────────── */
function CourseBlock({
    course, audience, query, isOpen, onToggle, onEdit, onDelete,
    onAddLesson, onEditLesson, onDeleteLesson,
}: {
    course: Course;
    audience: number;
    query: string;
    isOpen: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onAddLesson: () => void;
    onEditLesson: (l: Lesson) => void;
    onDeleteLesson: (l: Lesson) => void;
}) {
    // Ангилал онооогүй сургалт өнгөгүй саарал болж хоцрохгүйн тулд sky авна
    const tone: Tone = course.category_color ?? 'sky';
    const Icon       = categoryIcon(course.category_icon);

    const total     = course.lessons.length;
    const drafts    = course.lessons.filter((l) => !l.is_published).length;
    const pages     = course.lessons.reduce((n, l) => n + l.page_count, 0);
    const bytes     = course.lessons.reduce((n, l) => n + l.file_size, 0);
    const viewers   = course.lessons.reduce((n, l) => n + l.viewers_count, 0);
    const completed = course.lessons.reduce((n, l) => n + l.completed_count, 0);
    const comments  = course.lessons.reduce((n, l) => n + l.comments_count, 0);
    const avg       = total > 0
        ? Math.round(course.lessons.reduce((n, l) => n + l.avg_progress, 0) / total)
        : 0;

    return (
        <section className={cn('overflow-hidden rounded-2xl border bg-card shadow-sm', TONE[tone].edge)}>
            <div className={cn('relative', TONE[tone].surface)}>
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

                    <button
                        onClick={onToggle}
                        className="relative size-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/10"
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
                            <span className="tabular-nums">{total} баримт</span>
                            {pages > 0 && <span className="tabular-nums">{pages} хуудас</span>}
                            {bytes > 0 && <span className="tabular-nums">{humanSize(bytes)}</span>}

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

                    <div className="hidden items-center gap-4 md:flex">
                        <MiniStat icon={Eye} value={viewers} label="уншсан" />
                        <MiniStat icon={CheckCircle2} value={completed} label="дууссан" tone="emerald" />
                        <MiniStat icon={MessageSquare} value={comments} label="сэтгэгдэл" />

                        <div className="w-28">
                            <Bar percent={avg} />
                        </div>
                    </div>

                    <span className="flex items-center gap-0.5">
                        <IconBtn icon={Plus} label="Баримт нэмэх" onClick={onAddLesson} />
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
                                <FileText className="size-5" />
                            </span>
                            <p className="text-xs text-muted-foreground">Энэ сургалтад баримт нэмээгүй байна.</p>
                            <button onClick={onAddLesson} className={CTA}>
                                <Plus className="size-3.5" />
                                Баримт нэмэх
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className={cn(
                                ROW,
                                'h-9 border-t bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
                            )}>
                                <span />
                                <span>Баримт</span>
                                <span className="hidden text-right sm:block">Хуудас</span>
                                <span className="hidden text-right lg:block">Хэмжээ</span>
                                <span className="hidden text-right lg:block">Уншсан</span>
                                <span className="hidden text-right lg:block">Дууссан</span>
                                <span className="hidden lg:block">Явц</span>
                                <span />
                            </div>

                            {course.lessons.map((lesson, i) => (
                                <DocumentRow
                                    key={lesson.id}
                                    lesson={lesson}
                                    index={i + 1}
                                    audience={audience}
                                    query={query}
                                    sectionTitle={course.sections.find((s) => s.id === lesson.section_id)?.title ?? null}
                                    onEdit={() => onEditLesson(lesson)}
                                    onDelete={() => onDeleteLesson(lesson)}
                                />
                            ))}
                        </>
                    )}
                </>
            )}
        </section>
    );
}

/* ── Баримтын мөр ──────────────────────────────────────────────────────── */
/**
 * Мөр бүрийн эхэнд файлын төрлийн дүрс суух нь энгийн боловч чухал: PDF,
 * PPT, Word гурав нь өөр өөр зан чанартай (PDF шууд, бусад нь хөрвүүлэгддэг)
 * тул админ доошоо гүйлгэхдээ ямар сантай ажиллаж байгаагаа нүдээр мэднэ.
 */
function DocumentRow({ lesson, index, audience, query, sectionTitle, onEdit, onDelete }: {
    lesson: Lesson;
    index: number;
    audience: number;
    query: string;
    sectionTitle: string | null;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const reach = audience > 0 ? Math.round((lesson.completed_count / audience) * 100) : 0;
    const Icon  = fileIcon(lesson.doc_source_name);
    const ready = lesson.doc_status === 'ready' && lesson.has_document;

    return (
        <div className={cn(ROW, 'group h-14 border-t transition-colors hover:bg-muted/40')}>
            <span className="text-right text-[11px] tabular-nums text-muted-foreground/60">{index}</span>

            <span className="flex min-w-0 items-center gap-2.5">
                <span className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-lg',
                    ready ? TONE['sky'].tile : 'bg-muted text-muted-foreground/70',
                )}>
                    <Icon className="size-4" />
                </span>

                <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold">{highlight(lesson.title, query)}</span>
                        {!lesson.is_published && <Tag tone="amber">Ноорог</Tag>}
                        {lesson.is_required && <Tag tone="rose">Заавал</Tag>}
                        <DocStatus lesson={lesson} />
                    </span>

                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        {sectionTitle && (
                            <span className="flex items-center gap-1">
                                <Layers className="size-3" />
                                {sectionTitle}
                            </span>
                        )}
                        {lesson.doc_source_name && (
                            <span className="truncate">{highlight(lesson.doc_source_name, query)}</span>
                        )}
                        {lesson.due_at && (
                            <span className={cn(
                                'flex items-center gap-1 tabular-nums',
                                lesson.is_overdue && 'font-semibold text-rose-600 dark:text-rose-400',
                            )}>
                                <Clock className="size-3" />
                                {lesson.due_at.slice(0, 10)}
                            </span>
                        )}
                    </span>
                </span>
            </span>

            <span className="hidden text-right text-[11px] tabular-nums text-muted-foreground sm:block">
                {lesson.page_count > 0 ? lesson.page_count : '—'}
            </span>

            <span className="hidden text-right text-[11px] tabular-nums text-muted-foreground lg:block">
                {humanSize(lesson.file_size)}
            </span>

            <span className={cn(
                'hidden text-right text-xs tabular-nums lg:block',
                lesson.viewers_count === 0 && 'text-muted-foreground/50',
            )}>
                {lesson.viewers_count}
            </span>

            <span className={cn(
                'hidden text-right text-xs tabular-nums lg:block',
                lesson.completed_count === 0 && 'text-muted-foreground/50',
            )}>
                {lesson.completed_count}
            </span>

            <span className="hidden lg:block" title={`Хамрах хүрээний ${reach}% нь уншиж дуусгасан`}>
                <Bar percent={lesson.avg_progress} />
                <span className={cn(
                    'mt-0.5 block text-[10px] font-semibold tabular-nums',
                    TONE[progressTone(lesson.avg_progress)].text,
                )}>
                    {lesson.avg_progress}%
                </span>
            </span>

            <span className="flex items-center justify-end gap-0.5">
                <IconBtn
                    icon={Eye}
                    label={ready ? 'Баримтыг нээх' : 'Баримт бэлэн болоогүй'}
                    href={ready ? `/admin/lab-training/lessons/${lesson.id}/document` : undefined}
                    disabled={!ready}
                />
                <IconBtn icon={Edit} label="Засах" onClick={onEdit} />
                <IconBtn icon={Trash2} label="Устгах" danger onClick={onDelete} />
            </span>
        </div>
    );
}

/** Хөрвүүлэлтийн төлөвийн шошго — бэлэн бол чимээгүй, асуудалтай бол л ярина. */
function DocStatus({ lesson }: { lesson: Lesson }) {
    if (lesson.doc_status === 'pending') {
        return (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <Loader2 className="size-3 animate-spin" />
                Хөрвүүлж байна
            </span>
        );
    }

    if (lesson.doc_status === 'failed') {
        return (
            <button
                type="button"
                title={lesson.doc_error ?? 'Хөрвүүлэлт амжилтгүй'}
                onClick={() => router.post(
                    `/admin/lab-training/lessons/${lesson.id}/reconvert`,
                    {},
                    { preserveScroll: true },
                )}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25"
            >
                <RefreshCw className="size-3" />
                Дахин оролдох
            </button>
        );
    }

    if (!lesson.has_document) {
        return <Tag tone="slate">Файлгүй</Tag>;
    }

    return null;
}

/** Эх файлын өргөтгөлөөр дүрс сонгоно. */
function fileIcon(name: string | null) {
    const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'ppt' || ext === 'pptx' || ext === 'odp') return FileSpreadsheet;
    if (ext === 'doc' || ext === 'docx' || ext === 'odt') return FileType2;

    return FileText;
}

/* ── Баримт нэмэх / засах ──────────────────────────────────────────────── */
function DocumentModal({ courseId, sections, lesson, onClose }: {
    courseId: number; sections: Section[]; lesson: Lesson | null; onClose: () => void;
}) {
    const { data, setData, post, processing, errors } = useForm({
        lab_course_id: courseId,
        lab_section_id: lesson?.section_id ?? '',
        title: lesson?.title ?? '',
        description: lesson?.description ?? '',
        document: null as File | null,
        attachments: [] as File[],
        is_published: lesson?.is_published ?? false,
        is_required: lesson?.is_required ?? false,
        due_at: lesson?.due_at ?? '',
    });

    function submit(e: FormEvent) {
        e.preventDefault();

        post(lesson ? `/admin/lab-training/lessons/${lesson.id}` : '/admin/lab-training/lessons', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    // Шинэ баримтад файл заавал — засварлахад хуучин нь хэвээр үлдэнэ
    const needsDoc = !lesson && !data.document;

    return (
        <LabModal
            size="lg"
            title={lesson ? 'Баримт засах' : 'Шинэ баримт хичээл'}
            description={lesson ? lesson.title : 'PDF шууд харагдана. PPT, DOCX-ийг сервер өөрөө PDF болгоно.'}
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
                            placeholder="Жишээ: Ариутгалын журам"
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

                <div>
                    <label className={LABEL}>Баримт (PDF, PPT, PPTX, DOC, DOCX)</label>
                    <input
                        type="file"
                        accept=".pdf,.ppt,.pptx,.doc,.docx,.odp,.odt"
                        onChange={(e) => setData('document', e.target.files?.[0] ?? null)}
                        className={FILE_INPUT}
                    />
                    <FieldError message={errors.document} />

                    {/* Хадгалагдсан баримтын төлөв */}
                    {lesson && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px]">
                            <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate">
                                {lesson.doc_source_name ?? 'Баримт'}
                            </span>

                            {lesson.doc_status === 'ready' && (
                                <>
                                    <Tag tone="emerald">{lesson.page_count} хуудас</Tag>
                                    <a
                                        href={`/admin/lab-training/lessons/${lesson.id}/document`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="shrink-0 font-medium text-violet-600 hover:underline dark:text-violet-400"
                                    >
                                        Нээж үзэх
                                    </a>
                                </>
                            )}

                            {lesson.doc_status === 'pending' && <Tag tone="amber">Хөрвүүлж байна…</Tag>}

                            {lesson.doc_status === 'failed' && (
                                <>
                                    <Tag tone="rose">Хөрвүүлэлт амжилтгүй</Tag>
                                    <button
                                        type="button"
                                        onClick={() => router.post(
                                            `/admin/lab-training/lessons/${lesson.id}/reconvert`,
                                            {},
                                            { preserveScroll: true },
                                        )}
                                        className="shrink-0 font-medium text-violet-600 hover:underline dark:text-violet-400"
                                    >
                                        Дахин оролдох
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {lesson?.doc_status === 'failed' && lesson.doc_error && (
                        <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                            {lesson.doc_error}
                        </p>
                    )}

                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Явц нь хуудсаар хэмжигдэнэ. Ажилтан сүүлийн хуудсыг үзсэний дараа л
                        "уншиж дууслаа" гэж тэмдэглэж чадна.
                    </p>
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
                        label="Заавал унших"
                        hint="Тайланд тусад нь хянагдана."
                    />
                </div>

                {data.is_required && (
                    <div>
                        <label className={LABEL}>Уншиж дуусгах хугацаа</label>
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
                    disabled={processing || !data.title || needsDoc}
                    onCancel={onClose}
                />

                {needsDoc && (
                    <p className="text-right text-[11px] text-muted-foreground">
                        Баримт файлаа сонгоно уу.
                    </p>
                )}
            </form>
        </LabModal>
    );
}
