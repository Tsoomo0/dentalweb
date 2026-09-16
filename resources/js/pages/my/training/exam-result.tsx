import MyScroll from '@/components/my-scroll';
import { Chip } from '@/components/lab-training-ui';
import MyLayout from '@/layouts/my-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft, Award, CheckCircle2, Clock3, MinusCircle, PlayCircle, Target, XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface Question {
    id: number;
    type: 'single' | 'multiple' | 'truefalse' | 'text';
    body: string;
    points: number;
    awarded: number;
    is_correct: boolean | null;
    feedback: string | null;
    text: string | null;
    selected: number[];
    explanation: string | null;
    options: { id: number; body: string; is_correct?: boolean }[];
}

interface Props {
    exam: { id: number; title: string; pass_percent: number; lesson_id: number | null };
    attempt: {
        id: number;
        submitted_at: string | null;
        score: number;
        max_score: number;
        percent: number;
        is_passed: boolean;
        status: string;
    };
    reveal: boolean;
    questions: Question[];
}

type Filter = 'all' | 'correct' | 'wrong' | 'pending';

export default function LabExamResult({ exam, attempt, reveal, questions }: Props) {
    const pending = attempt.status === 'submitted';
    const [filter, setFilter] = useState<Filter>('all');

    const counts = useMemo(() => ({
        all:     questions.length,
        correct: questions.filter((q) => q.is_correct === true).length,
        wrong:   questions.filter((q) => q.is_correct === false).length,
        pending: questions.filter((q) => q.is_correct === null).length,
    }), [questions]);

    const visible = useMemo(() => questions.filter((q) => {
        if (filter === 'correct') return q.is_correct === true;
        if (filter === 'wrong')   return q.is_correct === false;
        if (filter === 'pending') return q.is_correct === null;

        return true;
    }), [questions, filter]);

    /** Төлөвөөс хамаарсан өнгөний багц — хуудсанд нэг мөр байлгана. */
    const tone = pending ? 'amber' : attempt.is_passed ? 'emerald' : 'rose';

    const SURFACE = {
        amber:   'border-amber-200/70 bg-gradient-to-br from-amber-50 via-card to-card shadow-amber-900/[0.06] dark:border-amber-500/30 dark:from-amber-500/10',
        emerald: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-card to-card shadow-emerald-900/[0.07] dark:border-emerald-500/30 dark:from-emerald-500/10',
        rose:    'border-rose-200/70 bg-gradient-to-br from-rose-50 via-card to-card shadow-rose-900/[0.06] dark:border-rose-500/30 dark:from-rose-500/10',
    }[tone];

    const TILE = {
        amber:   'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30',
        emerald: 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30',
        rose:    'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/30',
    }[tone];

    const TEXT = {
        amber:   'bg-gradient-to-br from-amber-500 to-amber-700 dark:from-amber-200 dark:to-amber-400',
        emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-200 dark:to-emerald-400',
        rose:    'bg-gradient-to-br from-rose-500 to-rose-700 dark:from-rose-200 dark:to-rose-400',
    }[tone];

    const BADGE = {
        amber:   'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300',
        emerald: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
        rose:    'bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300',
    }[tone];

    const BAR = {
        amber:   'bg-gradient-to-r from-amber-400 to-amber-600',
        emerald: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
        rose:    'bg-gradient-to-r from-rose-400 to-rose-600',
    }[tone];

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Шалгалт', href: '/my/training/exams' },
        { title: exam.title, href: `/my/training/exams/${exam.id}` },
        { title: 'Үр дүн', href: `/my/training/exams/${exam.id}/result/${attempt.id}` },
    ];

    const FILTERS: { key: Filter; label: string; count: number }[] = [
        { key: 'all',     label: 'Бүгд',          count: counts.all },
        { key: 'correct', label: 'Зөв',           count: counts.correct },
        { key: 'wrong',   label: 'Буруу',         count: counts.wrong },
        { key: 'pending', label: 'Хүлээгдэж буй', count: counts.pending },
    ];

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title={`${exam.title} — үр дүн`} />

            <MyScroll className="w-full space-y-4 bg-[var(--my-page-bg)] p-4 sm:p-6 md:bg-transparent lg:p-8 2xl:px-10">
                {/* ── Дүн ────────────────────────────────────────────────── */}
                <section className={cn('relative overflow-hidden rounded-3xl border shadow-xl', SURFACE)}>
                    <div
                        aria-hidden
                        className={cn(
                            'pointer-events-none absolute -left-20 -top-28 size-72 rounded-full blur-3xl',
                            tone === 'amber' ? 'bg-amber-400/20' : tone === 'emerald' ? 'bg-emerald-400/25' : 'bg-rose-400/20',
                        )}
                    />

                    <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-8">
                        {/* Зүүн — оноо */}
                        <div className="flex min-w-0 shrink-0 items-center gap-4">
                            <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg ring-1 ring-inset ring-white/20', TILE)}>
                                {pending ? <Clock3 className="size-7" /> : attempt.is_passed ? <Award className="size-7" /> : <XCircle className="size-7" />}
                            </span>

                            <div className="min-w-0">
                                <p className={cn('bg-clip-text text-4xl font-bold leading-none tabular-nums tracking-tight text-transparent sm:text-5xl', TEXT)}>
                                    {attempt.percent}%
                                </p>
                                <p className="mt-1.5 text-[12px] text-muted-foreground">
                                    {attempt.score} / {attempt.max_score} оноо
                                    {attempt.submitted_at && ` · ${attempt.submitted_at}`}
                                </p>
                            </div>
                        </div>

                        {/* Дунд — тэнцэх босго ба задаргаа */}
                        <div className="min-w-0 flex-1">
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold ring-1 ring-inset', BADGE)}>
                                {pending
                                    ? 'Задгай хариултыг багш үнэлж байна'
                                    : attempt.is_passed
                                      ? 'Амжилттай тэнцлээ'
                                      : `Тэнцээгүй (шаардлага: ${exam.pass_percent}%)`}
                            </span>

                            {/* Явцын шугам дээр тэнцэх босгыг тэмдэглэнэ */}
                            <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className={cn('h-full rounded-full transition-[width] duration-700', BAR)}
                                    style={{ width: `${Math.min(100, attempt.percent)}%` }}
                                />
                            </div>
                            <div className="relative mt-1 h-4">
                                <span
                                    className="absolute -translate-x-1/2 text-[9.5px] font-semibold text-muted-foreground"
                                    style={{ left: `${Math.min(100, exam.pass_percent)}%` }}
                                >
                                    <span className="mx-auto mb-0.5 block h-1.5 w-px bg-border" />
                                    <Target className="mr-0.5 inline size-2.5" />
                                    {exam.pass_percent}%
                                </span>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2 sm:max-w-md">
                                <Summary label="Зөв"    value={counts.correct} className="text-emerald-600 dark:text-emerald-400" />
                                <Summary label="Буруу"  value={counts.wrong}   className="text-rose-600 dark:text-rose-400" />
                                <Summary label="Хүлээгдэж буй" value={counts.pending} className="text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>

                        {/* Баруун — үйлдэл */}
                        <div className="flex shrink-0 flex-col gap-2 lg:w-52">
                            <Link
                                href={`/my/training/exams/${exam.id}`}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card px-4 py-2.5 text-[12.5px] font-semibold shadow-sm transition hover:bg-muted/50"
                            >
                                <ArrowLeft className="size-3.5" />
                                Шалгалт руу буцах
                            </Link>
                            {exam.lesson_id && (
                                <Link
                                    href={`/my/training/lessons/${exam.lesson_id}`}
                                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card px-4 py-2.5 text-[12.5px] font-semibold shadow-sm transition hover:bg-muted/50"
                                >
                                    <PlayCircle className="size-3.5" />
                                    Хичээлийг дахин үзэх
                                </Link>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── Шүүлтүүр ───────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/70 bg-card p-2 shadow-sm">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={cn(
                                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition',
                                filter === f.key
                                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/20'
                                    : 'bg-muted/70 text-muted-foreground hover:bg-muted',
                            )}
                        >
                            {f.label}
                            <span className="text-[9.5px] font-bold tabular-nums opacity-60">{f.count}</span>
                        </button>
                    ))}

                    {!reveal && (
                        <p className="ml-auto pr-1 text-[11px] text-muted-foreground">
                            Зөв хариултыг харуулахгүй тохиргоотой шалгалт
                        </p>
                    )}
                </div>

                {/* ── Асуулт тус бүрийн задаргаа ─────────────────────────── */}
                <div className="grid gap-3 xl:grid-cols-2">
                    {visible.map((question) => (
                        <article
                            key={question.id}
                            className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:shadow-md"
                        >
                            <span
                                className={cn(
                                    'absolute inset-y-0 left-0 w-[3px]',
                                    question.is_correct === null
                                        ? 'bg-gradient-to-b from-amber-400 to-amber-600'
                                        : question.is_correct
                                          ? 'bg-gradient-to-b from-emerald-400 to-emerald-600'
                                          : 'bg-gradient-to-b from-rose-400 to-rose-600',
                                )}
                            />

                            <div className="flex items-start gap-2.5 border-b border-border/70 bg-muted/25 px-3.5 py-2.5">
                                <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-muted text-[11px] font-bold tabular-nums ring-1 ring-inset ring-border">
                                    {questions.indexOf(question) + 1}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <p className="whitespace-pre-line text-[13px] font-semibold leading-relaxed">{question.body}</p>
                                    <p className="mt-0.5 text-[10.5px] tabular-nums text-muted-foreground">
                                        {question.awarded} / {question.points} оноо
                                    </p>
                                </div>

                                {question.is_correct === null ? (
                                    <Chip tone="amber" icon={MinusCircle}>Хүлээгдэж буй</Chip>
                                ) : question.is_correct ? (
                                    <Chip tone="emerald" icon={CheckCircle2}>Зөв</Chip>
                                ) : (
                                    <Chip tone="rose" icon={XCircle}>Буруу</Chip>
                                )}
                            </div>

                            <div className="space-y-1.5 p-3.5">
                                {question.type === 'text' ? (
                                    <div className="rounded-xl bg-muted/50 p-3 text-[12.5px]">
                                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Таны хариулт
                                        </p>
                                        <p className="whitespace-pre-line leading-relaxed">{question.text || '— хоосон —'}</p>
                                    </div>
                                ) : (
                                    question.options.map((option) => {
                                        const chosen  = question.selected.includes(option.id);
                                        const correct = reveal && option.is_correct === true;
                                        const wrong   = reveal && chosen && !option.is_correct;

                                        return (
                                            <div
                                                key={option.id}
                                                className={cn(
                                                    'flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] transition',
                                                    correct && 'border-emerald-400/70 bg-emerald-50 font-medium ring-1 ring-inset ring-emerald-500/20 dark:border-emerald-500/50 dark:bg-emerald-500/10',
                                                    wrong   && 'border-rose-400/70 bg-rose-50 ring-1 ring-inset ring-rose-500/20 dark:border-rose-500/50 dark:bg-rose-500/10',
                                                    !correct && !wrong && chosen && 'border-violet-400/70 bg-violet-50 ring-1 ring-inset ring-violet-500/20 dark:border-violet-500/50 dark:bg-violet-500/10',
                                                    !correct && !wrong && !chosen && 'border-border/70',
                                                )}
                                            >
                                                <span className="min-w-0 flex-1">{option.body}</span>
                                                {chosen && (
                                                    <span className="shrink-0 rounded-full bg-background/60 px-1.5 py-0.5 text-[9.5px] font-semibold text-muted-foreground">
                                                        сонгосон
                                                    </span>
                                                )}
                                                {correct && <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                                                {wrong && <XCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />}
                                            </div>
                                        );
                                    })
                                )}

                                {question.feedback && (
                                    <p className="rounded-xl bg-violet-50 p-3 text-[12px] leading-relaxed dark:bg-violet-500/10">
                                        <span className="font-semibold">Багшийн тайлбар: </span>
                                        {question.feedback}
                                    </p>
                                )}

                                {question.explanation && (
                                    <p className="rounded-xl bg-muted/50 p-3 text-[12px] leading-relaxed text-muted-foreground">
                                        {question.explanation}
                                    </p>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </MyScroll>
        </MyLayout>
    );
}

/* ── Хэсгүүд ───────────────────────────────────────────────────────────── */

function Summary({ label, value, className }: { label: string; value: number; className: string }) {
    return (
        <div className="rounded-xl border border-border/70 bg-card/70 px-3 py-2 backdrop-blur">
            <p className="truncate text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={cn('text-lg font-bold leading-tight tabular-nums', value > 0 ? className : '')}>{value}</p>
        </div>
    );
}
