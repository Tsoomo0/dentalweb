import {
    AvatarRing, Bar, Empty, GLASS, GLASS_CTA, HeroShell, HeroStat, HeroStatGrid, Tag,
} from '@/components/lab-admin-ui';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle, ArrowLeft, Award, BookOpen, CalendarClock, CheckCircle2,
    ChevronDown, Clock, Download, GraduationCap, History, Layers, Play, Target,
} from 'lucide-react';
import { ReactNode, useState } from 'react';

/**
 * Админ тал — нэг ажилтны сургалтын хувийн хэрэг.
 *
 * ДҮРСЛЭЛИЙН БОДОЛ: энэ хуудсыг гүйцэтгэлийн ярилцлагын үеэр дэлгэц дээр
 * нээж, эсвэл хэвлэж ширээн дээр тавина. Тиймээс дээрээс доош уншихад
 * бүрэн түүх өгүүлэгдэх ёстой: хэн бэ → хэр амжсан бэ → юуг нь дуусгасан бэ
 * → шалгалтад хэрхэн тэнцсэн бэ → хэзээ юу хийсэн бэ.
 *
 * Хугацаа хэтэрсэн зүйл байвал бүх зүйлээс ӨМНӨ гарна — ярилцлагад орохын
 * өмнө мэдэх ёстой цорын ганц зүйл нь тэр.
 */

interface LessonRow {
    id: number;
    title: string;
    duration_label: string;
    is_required: boolean;
    due_at: string | null;
    progress: number;
    views_count: number;
    watched_seconds: number;
    completed_at: string | null;
    completed: boolean;
    is_late: boolean;
}

interface CourseRow {
    id: number;
    title: string;
    category: string | null;
    total: number;
    completed: number;
    started: number;
    percent: number;
    watch_hours: number;
    late: number;
    lessons: LessonRow[];
}

interface ExamRow {
    id: number;
    title: string;
    pass_percent: number;
    attempts: number;
    best_percent: number;
    best_score: number;
    max_score: number;
    is_passed: boolean;
    pending: boolean;
    last_at: string | null;
}

interface OverdueRow {
    id: number;
    title: string;
    course_title: string;
    due_at: string | null;
    days_late: number;
    progress: number;
}

interface TimelineRow {
    kind: 'lesson' | 'exam';
    at: string;
    title: string;
    subtitle: string;
    detail: string;
    ok: boolean;
}

interface Props {
    transcript: {
        employee: {
            user_id: number;
            name: string;
            number: string | null;
            position: string | null;
            branch: string | null;
            email: string | null;
            hired_at: string | null;
        };
        totals: {
            courses: number;
            courses_done: number;
            lessons: number;
            lessons_done: number;
            percent: number;
            watch_hours: number;
            exams_taken: number;
            exams_passed: number;
            avg_exam_score: number | null;
            late: number;
            last_active_at: string | null;
        };
        courses: CourseRow[];
        exams: ExamRow[];
        overdue: OverdueRow[];
        timeline: TimelineRow[];
    };
}

export default function LabEmployeeTranscript({ transcript }: Props) {
    const { employee: e, totals: t, courses, exams, overdue, timeline } = transcript;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Админ', href: '/admin/dashboard' },
        { title: 'Тайлан', href: '/admin/lab-training/report' },
        { title: e.name, href: `/admin/lab-training/report/employees/${e.user_id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${e.name} — сургалтын хувийн хэрэг`} />

            {/* ── Толгой ─────────────────────────────────────────────────── */}
            <HeroShell>
                <div className="px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                            {/* Явцын цагираг — нэрний хажууд шууд ерөнхий дүр зураг */}
                            <span className="scale-[1.9] pl-3 pr-4">
                                <AvatarRing name={e.name} percent={t.percent} idle={t.lessons_done === 0} />
                            </span>

                            <div className="min-w-0">
                                <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/90">
                                    Сургалтын хувийн хэрэг
                                </p>

                                <h1 className="mt-1.5 text-2xl font-black leading-tight tracking-tight sm:text-[28px]">
                                    {e.name}
                                </h1>

                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    {e.position && <HeroChip icon={Target}>{e.position}</HeroChip>}
                                    {e.branch && <HeroChip icon={Layers}>{e.branch}</HeroChip>}
                                    {e.number && <HeroChip>№ {e.number}</HeroChip>}
                                    {e.hired_at && (
                                        <HeroChip icon={CalendarClock}>Ажилд орсон {e.hired_at}</HeroChip>
                                    )}
                                    {t.late > 0 && (
                                        <HeroChip icon={AlertTriangle} warn>
                                            {t.late} хугацаа хэтэрсэн
                                        </HeroChip>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <a
                                href={`/admin/lab-training/report/employees/${e.user_id}/pdf`}
                                className={GLASS_CTA}
                            >
                                <Download className="size-3.5" />
                                PDF татах
                            </a>
                            <Link href="/admin/lab-training/report" className={GLASS}>
                                <ArrowLeft className="size-3.5" />
                                Буцах
                            </Link>
                        </div>
                    </div>

                    <HeroStatGrid className="mt-5 xl:grid-cols-6">
                        <HeroStat
                            tone="violet" icon={Play} label="Ерөнхий явц"
                            value={`${t.percent}%`} percent={t.percent}
                            hint={t.last_active_at ? `сүүлд ${t.last_active_at}` : 'идэвх алга'}
                        />
                        <HeroStat
                            tone="emerald" icon={CheckCircle2} label="Дуусгасан хичээл"
                            value={`${t.lessons_done}/${t.lessons}`}
                            percent={t.lessons > 0 ? (t.lessons_done / t.lessons) * 100 : 0}
                        />
                        <HeroStat
                            tone="sky" icon={BookOpen} label="Дуусгасан сургалт"
                            value={`${t.courses_done}/${t.courses}`}
                            percent={t.courses > 0 ? (t.courses_done / t.courses) * 100 : 0}
                        />
                        <HeroStat
                            tone="indigo" icon={GraduationCap} label="Тэнцсэн шалгалт"
                            value={`${t.exams_passed}/${t.exams_taken}`}
                            percent={t.exams_taken > 0 ? (t.exams_passed / t.exams_taken) * 100 : 0}
                        />
                        <HeroStat
                            tone="amber" icon={Award} label="Дундаж дүн"
                            value={t.avg_exam_score === null ? '—' : `${t.avg_exam_score}%`}
                            hint="шилдэг оролдлогуудаар"
                            percent={t.avg_exam_score ?? 0}
                        />
                        <HeroStat
                            tone="orange" icon={Clock} label="Нийт цаг"
                            value={t.watch_hours} hint="бичлэг үзсэн"
                        />
                    </HeroStatGrid>
                </div>
            </HeroShell>

            <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
                {/* ── Хугацаа хэтэрсэн — бүхнээс өмнө ────────────────────── */}
                {overdue.length > 0 && (
                    <section className="overflow-hidden rounded-2xl border border-rose-200/70 bg-rose-50/40 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/[0.06]">
                        <div className="flex items-center gap-2 border-b border-rose-200/70 px-3 py-2.5 dark:border-rose-500/20 sm:px-4">
                            <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight text-rose-700 dark:text-rose-300">
                                <AlertTriangle className="size-4" />
                                Хугацаа хэтэрсэн заавал үзэх хичээл
                            </h2>
                            <span className="rounded-full bg-rose-100 px-2 text-[11px] font-semibold leading-5 tabular-nums text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                                {overdue.length}
                            </span>
                        </div>

                        {overdue.map((o, i) => (
                            <div
                                key={o.id}
                                className={cn(
                                    'flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 sm:px-4',
                                    i > 0 && 'border-t border-rose-200/50 dark:border-rose-500/15',
                                )}
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13px] font-medium">{o.title}</span>
                                    <span className="block truncate text-[11px] text-muted-foreground">
                                        {o.course_title} · хугацаа {o.due_at}
                                    </span>
                                </span>

                                <span className="w-28 shrink-0">
                                    <Bar percent={o.progress} />
                                </span>

                                <Tag tone="rose">{o.days_late} хоног хоцорсон</Tag>
                            </div>
                        ))}
                    </section>
                )}

                {/* ── Сургалтын явц ──────────────────────────────────────── */}
                <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="flex items-center gap-2 border-b px-3 py-2.5 sm:px-4">
                        <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight">
                            <BookOpen className="size-4 text-muted-foreground" />
                            Сургалтын явц
                        </h2>
                        <span className="rounded-full bg-muted px-2 text-[11px] font-semibold leading-5 tabular-nums text-muted-foreground">
                            {courses.length}
                        </span>
                    </div>

                    {courses.length === 0 ? (
                        <Empty
                            title="Нээлттэй сургалт алга"
                            text="Энэ ажилтны албан тушаалд одоогоор ямар ч сургалт холбогдоогүй байна."
                        />
                    ) : (
                        courses.map((c, i) => <CourseBlock key={c.id} course={c} first={i === 0} />)
                    )}
                </section>

                {/* ── Шалгалтын дүн ──────────────────────────────────────── */}
                <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="flex items-center gap-2 border-b px-3 py-2.5 sm:px-4">
                        <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight">
                            <GraduationCap className="size-4 text-muted-foreground" />
                            Шалгалтын дүн
                        </h2>
                        <span className="rounded-full bg-muted px-2 text-[11px] font-semibold leading-5 tabular-nums text-muted-foreground">
                            {exams.length}
                        </span>
                    </div>

                    {exams.length === 0 ? (
                        <Empty title="Шалгалт өгөөгүй байна" text="Өгсөн шалгалт бүр энд дүнтэйгээ гарна." />
                    ) : (
                        <>
                            <div className={cn(EXAM_ROW, 'h-9 border-b bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground')}>
                                <span>Шалгалт</span>
                                <span className="text-right">Шилдэг дүн</span>
                                <span className="hidden text-right sm:block">Оролдлого</span>
                                <span className="hidden text-right lg:block">Тэнцэх</span>
                                <span className="hidden text-right lg:block">Огноо</span>
                            </div>

                            {exams.map((x) => <ExamRowView key={x.id} exam={x} />)}
                        </>
                    )}
                </section>

                {/* ── Ололтын түүх ───────────────────────────────────────── */}
                {timeline.length > 0 && (
                    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <div className="flex items-center gap-2 border-b px-3 py-2.5 sm:px-4">
                            <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight">
                                <History className="size-4 text-muted-foreground" />
                                Ололтын түүх
                            </h2>
                            <span className="rounded-full bg-muted px-2 text-[11px] font-semibold leading-5 tabular-nums text-muted-foreground">
                                {timeline.length}
                            </span>
                        </div>

                        <div className="px-3 py-3 sm:px-4">
                            {timeline.map((ev, i) => (
                                <div key={`${ev.at}-${i}`} className="flex gap-3">
                                    {/* Босоо шугам — сүүлийн мөрөнд тасарна */}
                                    <span className="flex flex-col items-center">
                                        <span className={cn(
                                            'mt-1.5 grid size-5 shrink-0 place-items-center rounded-full',
                                            ev.ok
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
                                        )}>
                                            {ev.kind === 'exam'
                                                ? <GraduationCap className="size-3" />
                                                : <CheckCircle2 className="size-3" />}
                                        </span>
                                        {i < timeline.length - 1 && (
                                            <span className="w-px flex-1 bg-border" />
                                        )}
                                    </span>

                                    <span className="min-w-0 flex-1 pb-3">
                                        <span className="flex flex-wrap items-baseline gap-x-2">
                                            <span className="truncate text-[13px] font-medium">{ev.title}</span>
                                            <span className={cn(
                                                'text-[11px] font-semibold tabular-nums',
                                                ev.ok
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-rose-600 dark:text-rose-400',
                                            )}>
                                                {ev.detail}
                                            </span>
                                        </span>
                                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                            {ev.subtitle} · {ev.at}
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}

/* ── Толгойн жижиг шошго ───────────────────────────────────────────────── */
function HeroChip({ icon: Icon, warn, children }: {
    icon?: typeof Clock; warn?: boolean; children: ReactNode;
}) {
    return (
        <span className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold backdrop-blur-sm',
            warn
                ? 'border-rose-400/30 bg-rose-400/15 text-rose-200'
                : 'border-white/15 bg-white/10 text-white/75',
        )}>
            {Icon && <Icon className="size-3 shrink-0" />}
            {children}
        </span>
    );
}

/* ── Нэг сургалт — дарахад хичээлүүд нь дэлгэгдэнэ ─────────────────────── */
function CourseBlock({ course: c, first }: { course: CourseRow; first: boolean }) {
    // Дуусаагүй сургалтыг анхнаасаа нээлттэй харуулна — анхаарал хэрэгтэй нь тэр
    const [open, setOpen] = useState(c.percent < 100);

    return (
        <div className={cn(!first && 'border-t')}>
            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40 sm:px-4',
                    open && 'bg-muted/30',
                )}
            >
                <ChevronDown className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    !open && '-rotate-90',
                )} />

                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold">{c.title}</span>
                        {c.percent >= 100 && (
                            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        )}
                        {c.late > 0 && <Tag tone="rose">{c.late} хоцорсон</Tag>}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {[c.category, `${c.completed}/${c.total} хичээл`, `${c.watch_hours} цаг`]
                            .filter(Boolean).join(' · ')}
                    </span>
                </span>

                <span className="w-28 shrink-0 sm:w-36">
                    <Bar percent={c.percent} />
                </span>
            </button>

            {open && (
                <div className="border-t bg-muted/10">
                    {c.lessons.map((l) => (
                        <div
                            key={l.id}
                            className={cn(LESSON_ROW, 'h-12 border-b border-border/50 last:border-b-0')}
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <span className={cn(
                                    'size-1.5 shrink-0 rounded-full',
                                    l.completed
                                        ? 'bg-emerald-500'
                                        : l.is_late
                                            ? 'bg-rose-500'
                                            : l.views_count > 0
                                                ? 'bg-amber-500'
                                                : 'bg-muted-foreground/25',
                                )} />
                                <span className="min-w-0">
                                    <span className={cn(
                                        'block truncate text-xs',
                                        l.views_count === 0 && 'text-muted-foreground',
                                    )}>
                                        {l.title}
                                    </span>
                                    {l.is_required && (
                                        <span className="block truncate text-[10px] text-muted-foreground">
                                            Заавал үзэх{l.due_at && ` · ${l.due_at}`}
                                        </span>
                                    )}
                                </span>
                            </span>

                            <Bar percent={l.progress} />

                            <span className="hidden text-right text-[11px] tabular-nums text-muted-foreground sm:block">
                                {l.duration_label}
                            </span>

                            <span className="hidden justify-end lg:flex">
                                {l.completed
                                    ? <Tag tone="emerald">Дуусгасан</Tag>
                                    : l.is_late
                                        ? <Tag tone="rose">Хоцорсон</Tag>
                                        : l.views_count > 0
                                            ? <Tag tone="amber">Үзэж байгаа</Tag>
                                            : <Tag>Эхлээгүй</Tag>}
                            </span>

                            <span className="hidden truncate text-right text-[11px] tabular-nums text-muted-foreground lg:block">
                                {l.completed_at ?? '—'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Хичээлийн мөрийн багана. */
const LESSON_ROW = cn(
    'grid items-center gap-x-3 pl-8 pr-3 sm:pl-10 sm:pr-4',
    'grid-cols-[minmax(0,1fr)_110px]',
    'sm:grid-cols-[minmax(0,1fr)_110px_56px]',
    'lg:grid-cols-[minmax(0,1fr)_110px_56px_96px_86px]',
);

/** Шалгалтын мөрийн багана. */
const EXAM_ROW = cn(
    'grid items-center gap-x-3 px-3 sm:px-4',
    'grid-cols-[minmax(0,1fr)_92px]',
    'sm:grid-cols-[minmax(0,1fr)_92px_72px]',
    'lg:grid-cols-[minmax(0,1fr)_92px_72px_64px_86px]',
);

function ExamRowView({ exam: x }: { exam: ExamRow }) {
    return (
        <div className={cn(EXAM_ROW, 'h-14 border-t transition-colors hover:bg-muted/40')}>
            <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium">{x.title}</span>
                    {x.is_passed
                        ? <Tag tone="emerald">Тэнцсэн</Tag>
                        : x.pending
                            ? <Tag tone="amber">Үнэлэгдэж буй</Tag>
                            : <Tag tone="rose">Тэнцээгүй</Tag>}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {x.best_score} / {x.max_score} оноо
                </span>
            </span>

            <span className={cn(
                'text-right text-sm font-bold tabular-nums',
                x.is_passed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400',
            )}>
                {x.best_percent}%
            </span>

            <span className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">
                {x.attempts}
            </span>

            <span className="hidden text-right text-xs tabular-nums text-muted-foreground lg:block">
                {x.pass_percent}%
            </span>

            <span className="hidden truncate text-right text-[11px] tabular-nums text-muted-foreground lg:block">
                {x.last_at ?? '—'}
            </span>
        </div>
    );
}
