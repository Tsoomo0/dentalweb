import {
    DocumentRow, EmptyState, LessonCard, ProgressBar, TONE, categoryIcon,
    type LessonCardData, type Tone,
} from '@/components/lab-training-ui';
import ProgressRing from '@/components/progress-ring';
import MyLayout from '@/layouts/my-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    MobileBody, MobileCard, MobileEmpty, MobileHero, MobileShell, MobileStatRow, RED, SURFACE,
} from '@/components/my-mobile-ui';
import {
    ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Clock, FileStack, FileText,
    GraduationCap, Play, PlayCircle,
} from 'lucide-react';

interface Lesson extends LessonCardData {
    section_id: number | null;
    description: string | null;
    kind: 'video' | 'document';
    page_count: number;
}

interface Section { id: number; title: string | null; order: number; lessons: Lesson[] }

interface Props {
    course: {
        id: number;
        /** Сургалт бүхэлдээ видео эсвэл файл — дүрслэл нь үүнээс хамаарна. */
        kind: 'video' | 'document';
        title: string;
        description: string | null;
        cover_url: string | null;
        category_name: string | null;
        category_color: Tone;
        category_icon: string;
        total: number;
        done: number;
        duration_min: number;
    };
    sections: Section[];
    resumeId: number | null;
    exams: { id: number; title: string; state: 'open' | 'upcoming' | 'closed'; is_open: boolean }[];
}

export default function LabCoursePage({ course, sections, resumeId, exams }: Props) {
    const isDoc = course.kind === 'document';

    // Буцах гарц нь ирсэн каталог руугаа заана — файл сургалтаас видео
    // каталог руу шидэгдвэл хэрэглэгч замаа алдана
    const catalogue = isDoc ? '/my/training/documents' : '/my/training';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isDoc ? 'Файл сургалт' : 'Видео сургалт', href: catalogue },
        { title: course.title, href: `/my/training/courses/${course.id}` },
    ];

    const pct     = course.total > 0 ? (course.done / course.total) * 100 : 0;
    const pageTotal = sections.reduce((n, sec) => n + sec.lessons.reduce((m, l) => m + (l.page_count ?? 0), 0), 0);
    const done    = course.done === course.total && course.total > 0;
    const Icon    = categoryIcon(course.category_icon);
    const tone    = course.category_color;
    // Ганц нэргүй бүлэг бол толгой харуулахгүй — илүүц шатлал үүсгэхгүй
    const flat    = sections.length === 1 && !sections[0].title;

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title={course.title} />

            {/* ═══════════════════ MOBILE ═══════════════════ */}
            <MobileCourse
                course={course}
                sections={sections}
                resumeId={resumeId}
                exams={exams}
                catalogue={catalogue}
                isDoc={isDoc}
                pageTotal={pageTotal}
            />

            {/* ═══════════════════ DESKTOP ═══════════════════ */}
            <div className="hidden w-full flex-col gap-3 p-4 md:flex md:p-6">
                {/* ── Сургалтын толгой ───────────────────────────────────── */}
                <section className="relative overflow-hidden rounded-2xl bg-[#0A0A0F] text-white shadow-xl shadow-black/20 ring-1 ring-white/10">
                    {course.cover_url && (
                        <img src={course.cover_url} alt="" className="absolute inset-0 size-full scale-125 object-cover opacity-[0.18] blur-2xl" />
                    )}

                    <div className="pointer-events-none absolute -right-28 -top-32 size-[26rem] rounded-full bg-violet-600/25 blur-[100px]" />
                    <div className="pointer-events-none absolute -bottom-32 left-1/4 size-80 rounded-full bg-fuchsia-500/15 blur-[90px]" />

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

                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Link
                                    href={catalogue}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/70 ring-1 ring-inset ring-white/15 backdrop-blur transition hover:bg-white/20 hover:text-white"
                                >
                                    <ArrowLeft className="size-3" />
                                    {isDoc ? 'Бүх файл сургалт' : 'Бүх видео сургалт'}
                                </Link>

                                {course.category_name && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-200 ring-1 ring-inset ring-white/15 backdrop-blur">
                                        <Icon className="size-3" />
                                        {course.category_name}
                                    </span>
                                )}
                            </div>

                            <h1 className="mt-3 bg-gradient-to-br from-white to-white/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-[30px]">
                                {course.title}
                            </h1>

                            {course.description && (
                                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/45">
                                    {course.description}
                                </p>
                            )}

                            {resumeId && (
                                <Link
                                    href={`/my/training/lessons/${resumeId}`}
                                    className="group mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-950 shadow-lg shadow-black/30 transition hover:bg-white/90 active:scale-95"
                                >
                                    {isDoc
                                        ? <FileText className="size-4 transition group-hover:scale-110" />
                                        : <Play className="size-4 fill-current transition group-hover:scale-110" />}
                                    {course.done > 0
                                        ? (isDoc ? 'Үргэлжлүүлэн унших' : 'Үргэлжлүүлэх')
                                        : (isDoc ? 'Унших' : 'Эхлэх')}
                                </Link>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-5 rounded-2xl bg-white/[0.05] p-4 shadow-inner ring-1 ring-inset ring-white/10 backdrop-blur-md sm:gap-7 sm:p-5">
                            <ProgressRing percent={pct} size={70} stroke={6} className="text-white" />

                            <div className="grid grid-cols-2 gap-x-7 gap-y-3">
                                <HeroStat value={`${course.done}/${course.total}`} label={isDoc ? 'баримт' : 'хичээл'} />
                                {isDoc ? (
                                    <HeroStat value={pageTotal > 0 ? String(pageTotal) : '—'} label="хуудас" />
                                ) : (
                                    <HeroStat value={course.duration_min > 0 ? `${course.duration_min}` : '—'} label="минут" />
                                )}
                                <HeroStat value={String(sections.length)} label="бүлэг" />
                                <HeroStat
                                    value={done ? 'Дууссан' : `${Math.round(pct)}%`}
                                    label="гүйцэтгэл"
                                    tone={done ? 'text-emerald-300' : undefined}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Шалгалт ────────────────────────────────────────────── */}
                {exams.length > 0 && (
                    <section className={cn('flex flex-wrap items-center gap-3 rounded-2xl border p-4', TONE.indigo.edge, TONE.indigo.surface)}>
                        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TONE.indigo.tile)}>
                            <GraduationCap className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">Энэ сургалтын шалгалт</p>
                            <p className="text-xs text-muted-foreground">Хичээлээ үзсэний дараа мэдлэгээ шалгаарай</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {exams.map((e) => (
                                <Link
                                    key={e.id}
                                    href={`/my/training/exams/${e.id}`}
                                    className={cn(
                                        'rounded-full px-4 py-2 text-xs font-semibold transition',
                                        e.is_open
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            : 'border bg-background text-muted-foreground hover:bg-muted',
                                    )}
                                >
                                    {e.title}
                                    {e.state === 'upcoming' && ' · Хугацаа болоогүй'}
                                    {e.state === 'closed' && ' · Хугацаа дууссан'}
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Бүлэг → Хичээлүүд ──────────────────────────────────── */}
                {course.total === 0 ? (
                    <EmptyState
                        icon={isDoc ? FileText : BookOpen}
                        title={isDoc ? 'Баримт нэмээгүй байна' : 'Хичээл нэмээгүй байна'}
                        description={isDoc
                            ? 'Энэ сургалтад баримт нэмэгдэхэд танд мэдэгдэл ирнэ.'
                            : 'Энэ сургалтад хичээл нэмэгдэхэд танд мэдэгдэл ирнэ.'}
                    />
                ) : (
                    sections.map((section, si) => {
                        const doneHere = section.lessons.filter((l) => l.is_completed).length;
                        // Дугаарлалт бүлэг дамжин үргэлжилнэ (1, 2, 3…)
                        const offset = sections
                            .slice(0, si)
                            .reduce((n, s) => n + s.lessons.length, 0);

                        return (
                            <section
                                key={section.id}
                                className="overflow-hidden rounded-xl border border-gray-200 bg-card shadow-sm dark:border-gray-800"
                            >
                                {!flat && (
                                    <header className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-muted/30 px-4 py-3 dark:border-gray-800">
                                        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold shadow-sm', TONE[tone].tile)}>
                                            {si + 1}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <h2 className="truncate text-sm font-bold">
                                                {section.title ?? (isDoc ? 'Бусад баримт' : 'Бусад хичээл')}
                                            </h2>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {section.lessons.length} {isDoc ? 'баримт' : 'хичээл'} · {doneHere} дуусгасан
                                            </p>
                                        </div>

                                        <div className="w-20 shrink-0">
                                            <ProgressBar
                                                percent={section.lessons.length ? (doneHere / section.lessons.length) * 100 : 0}
                                                tone={doneHere === section.lessons.length ? 'emerald' : tone}
                                            />
                                        </div>
                                    </header>
                                )}

                                {isDoc ? (
                                    /* Баримт постергүй тул мөрөөр эгнэнэ */
                                    <ul>
                                        {section.lessons.map((lesson, i) => (
                                            <DocumentRow
                                                key={lesson.id}
                                                lesson={lesson}
                                                index={offset + i + 1}
                                                tone={tone}
                                            />
                                        ))}
                                    </ul>
                                ) : (
                                    /* auto-fill — карт бүр өөрийн өргөнтэй, ганцаараа байлаа ч сунахгүй */
                                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3 p-3 sm:p-4">
                                        {section.lessons.map((lesson, i) => (
                                            <LessonCard
                                                key={lesson.id}
                                                lesson={lesson}
                                                index={offset + i + 1}
                                                tone={tone}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </section>
                        );
                    })
                )}
            </div>
        </MyLayout>
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

/* ══════════════════════ MOBILE ══════════════════════ */
/**
 * HR хэсгийн бусад хуудасны загвар: улаан hero + шилэн үзүүлэлт, дараа нь
 * цагаан картан доторх мөрүүд. Ширээний хувилбарын постерын тор гар утсанд
 * хэт олон зай иддэг тул энд хичээл бүр НЭГ мөр болж, нэг дэлгэцэнд бүтэн
 * бүлэг багтана.
 */
function MobileCourse({ course, sections, resumeId, exams, catalogue, isDoc, pageTotal }: {
    course: Props['course'];
    sections: Section[];
    resumeId: number | null;
    exams: Props['exams'];
    catalogue: string;
    isDoc: boolean;
    pageTotal: number;
}) {
    const accent = isDoc ? '#0284c7' : '#7c3aed';
    const pct    = course.total > 0 ? Math.round((course.done / course.total) * 100) : 0;
    const done   = course.done === course.total && course.total > 0;
    const unit   = isDoc ? 'баримт' : 'хичээл';

    // Ганц нэргүй бүлэг бол толгой харуулахгүй — илүүц шатлал үүсгэхгүй
    const flat = sections.length === 1 && !sections[0].title;

    let index = 0;

    return (
        <MobileShell>
            <MobileHero
                eyebrow={isDoc ? 'ФАЙЛ СУРГАЛТ' : 'ВИДЕО СУРГАЛТ'}
                back={catalogue}
                backdrop={course.cover_url}
                title={course.title}
                subtitle={course.description}
                showAvatar={false}
            >
                <MobileStatRow
                    items={[
                        { val: `${course.done}/${course.total}`, label: unit, dot: 'rgba(255,255,255,0.45)' },
                        {
                            val: isDoc
                                ? (pageTotal > 0 ? String(pageTotal) : '—')
                                : (course.duration_min > 0 ? String(course.duration_min) : '—'),
                            label: isDoc ? 'хуудас' : 'минут',
                            dot: '#93c5fd',
                        },
                        { val: done ? '100%' : `${pct}%`, label: 'гүйцэтгэл', dot: done ? '#4ade80' : '#fbbf24' },
                    ]}
                />

                {course.category_name && (
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '10px 0 0', fontWeight: 700, letterSpacing: 0.5, textAlign: 'center' }}>
                        {course.category_name.toUpperCase()}
                    </p>
                )}

                {resumeId && (
                    <Link href={`/my/training/lessons/${resumeId}`} style={{ textDecoration: 'none', display: 'block', marginTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'white', borderRadius: 15, padding: '13px 0' }}>
                            {isDoc ? <FileText size={16} color={RED} /> : <Play size={16} color={RED} fill={RED} />}
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#1c1c1e' }}>
                                {course.done > 0
                                    ? (isDoc ? 'Үргэлжлүүлэн унших' : 'Үргэлжлүүлэх')
                                    : (isDoc ? 'Унших' : 'Эхлэх')}
                            </span>
                        </div>
                    </Link>
                )}
            </MobileHero>

            <MobileBody>

                {/* Шалгалт */}
                {exams.length > 0 && (
                    <MobileCard style={{ padding: 14, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <GraduationCap size={15} color="#4f46e5" />
                            <p style={{ fontSize: 12.5, fontWeight: 800, color: SURFACE.text, margin: 0 }}>Энэ сургалтын шалгалт</p>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                            {exams.map((e) => (
                                <Link key={e.id} href={`/my/training/exams/${e.id}`} style={{ textDecoration: 'none' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', borderRadius: 99, padding: '7px 13px',
                                        fontSize: 11.5, fontWeight: 800,
                                        background: e.is_open ? '#4f46e5' : SURFACE.pill,
                                        color: e.is_open ? 'white' : SURFACE.muted,
                                    }}>
                                        {e.title}
                                        {e.state === 'upcoming' && ' · болоогүй'}
                                        {e.state === 'closed' && ' · дууссан'}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </MobileCard>
                )}

                {/* Бүлэг → хичээлүүд */}
                {course.total === 0 ? (
                    <MobileEmpty
                        icon={isDoc ? <FileStack size={28} color="#7dd3fc" /> : <BookOpen size={28} color="#c4b5fd" />}
                        tint={isDoc ? '#f0f9ff' : '#faf5ff'}
                        title={isDoc ? 'Баримт нэмээгүй байна' : 'Хичээл нэмээгүй байна'}
                        text="Шинээр нэмэгдэхэд танд мэдэгдэл ирнэ"
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {sections.map((section, si) => {
                            const doneHere = section.lessons.filter((l) => l.is_completed).length;

                            return (
                                <div key={section.id}>
                                    {!flat && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, paddingLeft: 2 }}>
                                            <div style={{ width: 18, height: 18, borderRadius: 6, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <span style={{ fontSize: 10, fontWeight: 900, color: 'white' }}>{si + 1}</span>
                                            </div>
                                            <p style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: 0.4, margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {section.title ?? (isDoc ? 'Бусад баримт' : 'Бусад хичээл')}
                                            </p>
                                            <p style={{ fontSize: 10.5, color: SURFACE.faint, margin: 0, fontWeight: 700 }}>
                                                {doneHere}/{section.lessons.length}
                                            </p>
                                        </div>
                                    )}

                                    <MobileCard>
                                        {section.lessons.map((lesson, li) => (
                                            <MobileLessonRow
                                                key={lesson.id}
                                                lesson={lesson}
                                                index={++index}
                                                last={li === section.lessons.length - 1}
                                                accent={accent}
                                                isDoc={isDoc}
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

/** Нэг хичээлийн мөр — төлөв нь зүүн талын дугуй дүрсээр шууд уншигдана. */
function MobileLessonRow({ lesson, index, last, accent, isDoc }: {
    lesson: Lesson;
    index: number;
    last: boolean;
    accent: string;
    isDoc: boolean;
}) {
    const started = lesson.progress > 0 && !lesson.is_completed;

    return (
        <Link href={`/my/training/lessons/${lesson.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: last ? 'none' : '1px solid var(--my-divider)' }}>
                {/* Төлөв */}
                <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: lesson.is_completed ? '#ecfdf5' : started ? `${accent}18` : SURFACE.pill,
                }}>
                    {lesson.is_completed
                        ? <CheckCircle2 size={17} color="#059669" />
                        : started
                            ? <PlayCircle size={17} color={accent} />
                            : <span style={{ fontSize: 12, fontWeight: 800, color: SURFACE.faint }}>{index}</span>}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: SURFACE.strong, margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lesson.title}
                        </p>
                        {lesson.is_overdue ? (
                            <span style={{ flexShrink: 0, background: '#fee2e2', color: '#b91c1c', borderRadius: 99, padding: '2px 7px', fontSize: 9.5, fontWeight: 800 }}>Хоцорсон</span>
                        ) : lesson.is_required && !lesson.is_completed ? (
                            <span style={{ flexShrink: 0, background: '#fef3c7', color: '#b45309', borderRadius: 99, padding: '2px 7px', fontSize: 9.5, fontWeight: 800 }}>Заавал</span>
                        ) : null}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <p style={{ fontSize: 11, color: SURFACE.faint, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                            {lesson.duration_label}
                        </p>
                        {started && (
                            <p style={{ fontSize: 11, color: accent, margin: 0, fontWeight: 700 }}>
                                {lesson.progress}% {isDoc ? 'уншсан' : 'үзсэн'}
                            </p>
                        )}
                        {lesson.due_at && !lesson.is_completed && (
                            <p style={{ fontSize: 11, color: lesson.is_overdue ? '#dc2626' : SURFACE.faint, margin: 0, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                                <Clock size={10} />
                                {lesson.due_at}
                            </p>
                        )}
                    </div>

                    {started && (
                        <div style={{ height: 3, borderRadius: 99, background: SURFACE.pill, overflow: 'hidden', marginTop: 6 }}>
                            <div style={{ height: '100%', width: `${lesson.progress}%`, borderRadius: 99, background: accent }} />
                        </div>
                    )}
                </div>

                <ChevronRight size={15} color={SURFACE.faint} style={{ flexShrink: 0 }} />
            </div>
        </Link>
    );
}
