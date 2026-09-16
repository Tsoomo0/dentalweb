import {
    BTN, CTA, Empty, GLASS, GLASS_CTA, HeroShell, HeroStat, HeroStatGrid, INPUT,
    IconBtn, Tag,
} from '@/components/lab-admin-ui';
import { TONE, type Tone } from '@/components/lab-training-ui';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle, BarChart3, CalendarClock, CheckCircle2, Clock, Edit, FileQuestion,
    GraduationCap, ListFilter, Lock, Plus, Repeat, Search, Trash2, Trophy, Users, Video,
} from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';

/**
 * Админ тал — лабын шалгалт.
 *
 * ДҮРСЛЭЛИЙН БОДОЛ: шалгалт бүр өөрийн амьдралын мөчлөгтэй (ноорог → нээлттэй
 * → хаагдсан), тиймээс мөрийн зүүн ирмэгийн өнгө нь тухайн төлөвийг барина.
 * Мөр дэлгэцийн бүтэн өргөнийг эзэлдэг тул тоонууд доошоо нэг шулуун дээр
 * эгнэж, олон шалгалтыг харьцуулахад амар. Оролдлого гарсан шалгалт түгжигдэж,
 * асуулт нь өөрчлөгдөхгүй болохыг нүдэнд шууд харагдуулсан.
 */

interface Exam {
    id: number;
    title: string;
    description: string | null;
    course_id: number | null;
    course_title: string | null;
    lesson_id: number | null;
    lesson_title: string | null;
    duration_minutes: number | null;
    pass_percent: number;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    show_answers: string;
    opens_at: string | null;
    closes_at: string | null;
    is_published: boolean;
    state: 'open' | 'upcoming' | 'closed';
    is_open: boolean;
    questions_count: number;
    attempts_count: number;
    passed_count: number;
    pending_count: number;
    max_score: number;
    /** Энэ шалгалтыг өгөх эрхтэй ажилтны тоо (сургалтын албан тушаалаас). */
    audience: number;
}

interface Props {
    exams: Exam[];
    audience: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Видео хичээл', href: '/admin/lab-training' },
    { title: 'Шалгалт', href: '/admin/lab-training/exams' },
];

type Filter = 'all' | 'open' | 'draft' | 'pending';

/**
 * Шалгалтын төлөв — өнгө, нэр хоёулаа эндээс гарна.
 *
 * "Нээгдээгүй" ба "хаагдсан" хоёрыг тусад нь нэрлэнэ: админ юу хийх ёстойгоо
 * (хүлээх үү, огноог сунгах уу) шууд ойлгох ёстой.
 */
function examState(exam: Exam): { tone: Tone; label: string } {
    if (!exam.is_published) return { tone: 'slate', label: 'Ноорог' };
    if (exam.state === 'upcoming') return { tone: 'amber', label: 'Хугацаа болоогүй' };
    if (exam.state === 'closed') return { tone: 'rose', label: 'Хугацаа дууссан' };

    return { tone: 'emerald', label: 'Нээлттэй' };
}

export default function LabExamsIndex({ exams, audience }: Props) {
    const [query, setQuery]   = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    const open      = exams.filter((e) => e.is_published && e.is_open).length;
    const drafts    = exams.filter((e) => !e.is_published).length;
    const attempts  = exams.reduce((n, e) => n + e.attempts_count, 0);
    const passed    = exams.reduce((n, e) => n + e.passed_count, 0);
    const pending   = exams.reduce((n, e) => n + e.pending_count, 0);
    const questions = exams.reduce((n, e) => n + e.questions_count, 0);

    const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

    const visible = useMemo(() => {
        const term = query.trim().toLowerCase();

        return exams.filter((e) => {
            if (filter === 'open' && !(e.is_published && e.is_open)) return false;
            if (filter === 'draft' && e.is_published) return false;
            if (filter === 'pending' && e.pending_count === 0) return false;
            if (!term) return true;

            return e.title.toLowerCase().includes(term)
                || (e.course_title ?? '').toLowerCase().includes(term)
                || (e.lesson_title ?? '').toLowerCase().includes(term);
        });
    }, [exams, query, filter]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Лабын шалгалт" />

            {/* ── Кино маягийн толгой ────────────────────────────────────── */}
            <HeroShell>
                <div className="px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/90">
                                <GraduationCap className="size-3" />
                                Лабораторийн сургалт
                            </p>

                            <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-[28px]">
                                Шалгалт
                            </h1>

                            <p className="mt-1 max-w-lg text-xs text-white/55">
                                Тест бэлдэж лаб ажилтнуудад нээнэ. Сонголттой асуултын оноо автоматаар бодогдоно.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <Link href="/admin/lab-training/report" className={GLASS}>
                                <BarChart3 className="size-3.5" />
                                Тайлан
                            </Link>
                            <Link href="/admin/lab-training" className={GLASS}>
                                <Video className="size-3.5" />
                                Хичээл рүү
                            </Link>
                            <Link href="/admin/lab-training/exams/create" className={GLASS_CTA}>
                                <Plus className="size-3.5" />
                                Шалгалт үүсгэх
                            </Link>
                        </div>
                    </div>

                    <HeroStatGrid className="mt-5 xl:grid-cols-6">
                        <HeroStat
                            tone="violet" icon={GraduationCap} label="Шалгалт"
                            value={exams.length} hint={`${open} нээлттэй`}
                            percent={share(open, exams.length)}
                        />
                        <HeroStat
                            tone="indigo" icon={FileQuestion} label="Асуулт"
                            value={questions} hint={`${drafts} ноорог шалгалт`}
                        />
                        <HeroStat
                            tone="sky" icon={Repeat} label="Өгсөн"
                            value={attempts} hint="нийт удаа"
                        />
                        <HeroStat
                            tone="emerald" icon={Trophy} label="Тэнцсэн"
                            value={passed} hint={`${share(passed, attempts)}%`}
                            percent={share(passed, attempts)}
                        />
                        <HeroStat
                            tone={pending > 0 ? 'amber' : 'slate'} icon={Clock} label="Үнэлэх"
                            value={pending} hint={pending > 0 ? 'гараар үнэлнэ' : 'хүлээгдэлгүй'}
                        />
                        <HeroStat
                            tone="rose" icon={Users} label="Хамрах хүрээ"
                            value={audience} hint="идэвхтэй ажилтан"
                        />
                    </HeroStatGrid>
                </div>
            </HeroShell>

            <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
                {pending > 0 && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                            Задгай хариулт бүхий <strong className="font-bold">{pending}</strong> шалгалт гараар үнэлэхийг хүлээж байна.
                        </span>
                        <button
                            onClick={() => setFilter('pending')}
                            className="shrink-0 font-semibold underline underline-offset-2"
                        >
                            Шүүх
                        </button>
                    </div>
                )}

                {/* ── Хайлт, шүүлт ──────────────────────────────────────── */}
                {exams.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Шалгалт, сургалт хайх"
                                className={cn(INPUT, 'h-9 rounded-xl pl-8')}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                            {([
                                ['all', 'Бүгд', exams.length],
                                ['open', 'Нээлттэй', open],
                                ['draft', 'Ноорог', drafts],
                                ['pending', 'Үнэлэх', pending],
                            ] as [Filter, string, number][]).map(([key, label, count]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFilter(key)}
                                    className={cn(
                                        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-medium transition',
                                        filter === key
                                            ? 'bg-foreground text-background shadow-sm'
                                            : 'border text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                >
                                    {key === 'all' && <ListFilter className="size-3" />}
                                    {label}
                                    <span className="tabular-nums opacity-50">{count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {exams.length === 0 ? (
                    <div className="rounded-2xl border bg-card">
                        <Empty
                            title="Шалгалт байхгүй байна"
                            text="Хичээлээ үзсэний дараа мэдлэгийг нь шалгах тест үүсгэнэ үү."
                            action={
                                <Link href="/admin/lab-training/exams/create" className={CTA}>
                                    <Plus className="size-3.5" />
                                    Шалгалт үүсгэх
                                </Link>
                            }
                        />
                    </div>
                ) : visible.length === 0 ? (
                    <div className="rounded-2xl border bg-card">
                        <Empty
                            title="Илэрц олдсонгүй"
                            text="Хайлт эсвэл шүүлтээ өөрчилж үзнэ үү."
                            action={
                                <button onClick={() => { setQuery(''); setFilter('all'); }} className={BTN}>
                                    Шүүлтийг цэвэрлэх
                                </button>
                            }
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {visible.map((exam) => (
                            <ExamCard key={exam.id} exam={exam} audience={audience} />
                        ))}
                    </div>
                )}
            </div>

        </AppLayout>
    );
}

/* ── Шалгалтын мөр ─────────────────────────────────────────────────────── */
/**
 * Дэлгэцийн бүтэн өргөнийг эзэлсэн мөр.
 *
 * Зүүн ирмэгийн тууз төлөвийг барина, дунд нь тодорхойлолт, баруун талд нь
 * тоонууд ба тэнцсэний бөгж. Ингэснээр олон шалгалт доошоо эгнэхэд бүх тоо
 * нэг босоо шулуун дээр таарч, харьцуулахад амар байна.
 */
function ExamCard({ exam, audience }: { exam: Exam; audience: number }) {
    const { tone, label } = examState(exam);
    const locked   = exam.attempts_count > 0;
    const passRate = exam.attempts_count > 0
        ? Math.round((exam.passed_count / exam.attempts_count) * 100)
        : 0;

    return (
        <article className={cn(
            'group relative overflow-hidden rounded-2xl border bg-card shadow-sm',
            'transition-shadow duration-300 hover:shadow-lg hover:shadow-black/[0.06] dark:hover:shadow-black/30',
            TONE[tone].edge,
        )}>
            {/* Төлөвийн тууз — мөрийн бүтэн өндрөөр */}
            <span className={cn('absolute inset-y-0 left-0 w-1', TONE[tone].bar)} />

            <div className="flex flex-col gap-4 py-3.5 pl-5 pr-3 lg:flex-row lg:items-center lg:gap-6 lg:pr-4">
                {/* ── Тодорхойлолт ──────────────────────────────────────── */}
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className={cn(
                        'grid size-11 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105',
                        TONE[tone].tile,
                    )}>
                        <GraduationCap className="size-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Link
                                href={`/admin/lab-training/exams/${exam.id}/results`}
                                className="truncate text-[15px] font-bold tracking-tight transition-colors hover:text-violet-600 dark:hover:text-violet-400"
                            >
                                {exam.title}
                            </Link>
                            <Tag tone={tone}>{label}</Tag>
                            {locked && (
                                <span
                                    title="Аль хэдийн өгсөн хүн байгаа тул асуулт өөрчлөх боломжгүй"
                                    className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 text-[10px] font-semibold leading-[18px] text-sky-700 ring-1 ring-sky-500/30 dark:text-sky-300"
                                >
                                    <Lock className="size-2.5" />
                                    Түгжигдсэн
                                </span>
                            )}
                        </div>

                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                            {[exam.course_title, exam.lesson_title].filter(Boolean).join(' · ') || 'Ерөнхий шалгалт'}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
                            <Meta icon={FileQuestion}>{exam.questions_count} асуулт · {exam.max_score} оноо</Meta>
                            <Meta icon={Clock}>{exam.duration_minutes ? `${exam.duration_minutes} мин` : 'Хязгааргүй'}</Meta>
                            <Meta icon={CheckCircle2}>Тэнцэх {exam.pass_percent}%</Meta>
                            <Meta icon={Users}>{exam.audience ?? audience} ажилтан</Meta>
                            {(exam.opens_at || exam.closes_at) && (
                                <Meta icon={CalendarClock}>
                                    {(exam.opens_at ?? '…').slice(0, 10)} — {(exam.closes_at ?? '…').slice(0, 10)}
                                </Meta>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Тоонууд ───────────────────────────────────────────── */}
                <div className="grid shrink-0 grid-cols-3 divide-x overflow-hidden rounded-xl border bg-muted/25 lg:w-[300px]">
                    <Cell value={exam.attempts_count} label="өгсөн" />
                    <Cell value={exam.passed_count} label="тэнцсэн" tone="emerald" />
                    <Cell value={exam.pending_count} label="үнэлэх" tone={exam.pending_count > 0 ? 'amber' : undefined} />
                </div>

                {/* ── Тэнцсэний бөгж ────────────────────────────────────── */}
                <PassRing percent={passRate} muted={exam.attempts_count === 0} />

                {/* ── Үйлдэл ────────────────────────────────────────────── */}
                <div className="flex shrink-0 items-center gap-0.5 lg:flex-col">
                    <IconBtn
                        icon={BarChart3}
                        label="Үр дүн"
                        href={`/admin/lab-training/exams/${exam.id}/results`}
                    />
                    <IconBtn icon={Edit} label="Засах" href={`/admin/lab-training/exams/${exam.id}/edit`} />
                    <IconBtn
                        icon={Trash2}
                        label="Устгах"
                        danger
                        onClick={() => {
                            if (confirm(`"${exam.title}" шалгалтыг бүх үр дүнтэй нь устгах уу?`)) {
                                router.delete(`/admin/lab-training/exams/${exam.id}`, { preserveScroll: true });
                            }
                        }}
                    />
                </div>
            </div>
        </article>
    );
}

/**
 * Тэнцсэний хувийг бөгжөөр харуулна.
 *
 * Оролдлого огт байхгүй үед тасархай хүрээ болж, "тэг хувь" ба "мэдээлэлгүй"
 * хоёрыг андуурахаас сэргийлнэ.
 */
function PassRing({ percent, muted }: { percent: number; muted: boolean }) {
    const value = Math.min(100, Math.max(0, percent));

    return (
        <div className="flex shrink-0 items-center gap-2.5">
            <span
                className="grid size-14 place-items-center rounded-full"
                style={{
                    background: muted
                        ? undefined
                        : `conic-gradient(rgb(16 185 129) ${value * 3.6}deg, rgb(148 163 184 / 0.2) 0)`,
                }}
            >
                <span className={cn(
                    'grid size-[46px] place-items-center rounded-full bg-card',
                    muted && 'ring-1 ring-dashed ring-muted-foreground/30',
                )}>
                    <span className={cn(
                        'text-[13px] font-black tabular-nums',
                        muted ? 'text-muted-foreground/40' : 'text-emerald-600 dark:text-emerald-400',
                    )}>
                        {muted ? '—' : `${value}%`}
                    </span>
                </span>
            </span>

            <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground lg:hidden xl:block">
                Тэнцсэн
                <br />
                хувь
            </span>
        </div>
    );
}

/** Мөрийн жижиг мэдээллийн хэсэг. */
function Meta({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
    return (
        <span className="flex items-center gap-1">
            <Icon className="size-3 shrink-0" />
            {children}
        </span>
    );
}

/** Тоон нүд. */
function Cell({ value, label, tone }: { value: number; label: string; tone?: Tone }) {
    return (
        <div className="px-3 py-2.5 text-center">
            <p className={cn(
                'text-xl font-black leading-none tabular-nums',
                value === 0 ? 'text-muted-foreground/40' : tone ? TONE[tone].text : 'text-foreground',
            )}>
                {value}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
    );
}
