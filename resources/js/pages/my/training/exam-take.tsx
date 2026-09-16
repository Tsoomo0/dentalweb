import MyScroll from '@/components/my-scroll';
import { FIELD } from '@/components/lab-training-ui';
import ProgressRing from '@/components/progress-ring';
import { csrfHeaders } from '@/lib/csrf';
import MyLayout from '@/layouts/my-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronUp, Cloud,
    Flag, Loader2, Send, Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface Question {
    id: number;
    type: 'single' | 'multiple' | 'truefalse' | 'text';
    body: string;
    points: number;
    image_url: string | null;
    options: { id: number; body: string }[];
    selected: number[];
    text: string;
}

interface Props {
    exam: { id: number; title: string; pass_percent: number; duration_minutes: number | null };
    attempt: { id: number; seconds_left: number | null };
    questions: Question[];
}

type Answer = { option_ids: number[]; text: string };

/** Сонголтын үсэг — "В хариултыг сонгосон" гэж ярихад амар. */
const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З'];

function clock(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function isAnswered(q: Question, a: Answer | undefined): boolean {
    if (!a) return false;

    return q.type === 'text' ? a.text.trim() !== '' : a.option_ids.length > 0;
}

export default function LabExamTake({ exam, attempt, questions }: Props) {
    const [answers, setAnswers] = useState<Record<number, Answer>>(() =>
        Object.fromEntries(questions.map((q) => [q.id, { option_ids: q.selected, text: q.text }])),
    );
    const [left, setLeft]       = useState(attempt.seconds_left);
    const [saving, setSaving]   = useState(false);
    const [savedAt, setSavedAt] = useState<number | null>(null);
    const [sending, setSending] = useState(false);
    const [current, setCurrent] = useState(questions[0]?.id ?? 0);
    const [openNav, setOpenNav] = useState(false);
    const submitted             = useRef(false);

    // Тэмдэглэсэн асуултууд — "эргэж хараарай" гэсэн хувийн тэмдэг.
    // Хуудас дахин ачаалагдсан ч алдагдахгүй байхаар browser-т хадгална.
    const flagKey = `lab-exam-flags-${attempt.id}`;
    const [flags, setFlags] = useState<number[]>(() => {
        try {
            return JSON.parse(localStorage.getItem(flagKey) ?? '[]');
        } catch {
            return [];
        }
    });

    const toggleFlag = (id: number) =>
        setFlags((prev) => {
            const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];

            try {
                localStorage.setItem(flagKey, JSON.stringify(next));
            } catch {
                // Хувийн горимд хадгалах боломжгүй байж болно — тэмдэг зөвхөн энэ сессэд үлдэнэ
            }

            return next;
        });

    const answeredIds = useMemo(
        () => new Set(questions.filter((q) => isAnswered(q, answers[q.id])).map((q) => q.id)),
        [questions, answers],
    );

    const answeredCount = answeredIds.size;
    const remaining     = questions.length - answeredCount;
    const progress      = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
    const urgent        = left !== null && left <= 60;

    const totalSeconds = exam.duration_minutes ? exam.duration_minutes * 60 : null;
    const timeRatio    = left !== null && totalSeconds ? Math.max(0, Math.min(1, left / totalSeconds)) : null;

    const cards = useRef<Record<number, HTMLDivElement | null>>({});

    const submit = useCallback((auto = false) => {
        if (submitted.current) return;

        if (!auto) {
            const unanswered = questions.length - answeredCount;
            const message = unanswered > 0
                ? `${unanswered} асуулт хариулаагүй байна. Ингээд илгээх үү? Илгээсний дараа засах боломжгүй.`
                : 'Шалгалтыг илгээх үү? Илгээсний дараа засах боломжгүй.';

            if (!confirm(message)) return;
        }

        submitted.current = true;
        setSending(true);

        router.post(`/my/training/exams/${exam.id}/attempt/${attempt.id}/submit`, {
            answers: Object.fromEntries(
                Object.entries(answers).map(([id, a]) => [id, { option_ids: a.option_ids, text: a.text }]),
            ),
        });
    }, [answers, answeredCount, attempt.id, exam.id, questions.length]);

    /** Хугацааны тоолуур — 0 болмогц автоматаар илгээнэ. */
    useEffect(() => {
        if (left === null) return;

        const timer = setInterval(() => {
            setLeft((v) => {
                if (v === null) return v;
                if (v <= 1) {
                    clearInterval(timer);
                    submit(true);

                    return 0;
                }

                return v - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Дэлгэц дээр харагдаж буй асуултыг навигацид тодруулна. */
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

                if (visible) setCurrent(Number(visible.target.getAttribute('data-qid')));
            },
            { rootMargin: '-30% 0px -55% 0px', threshold: 0 },
        );

        Object.values(cards.current).forEach((el) => el && observer.observe(el));

        return () => observer.disconnect();
    }, [questions.length]);

    /** Нэг асуултын хариултыг шууд сервер рүү хадгална. */
    async function persist(questionId: number, answer: Answer) {
        setSaving(true);

        try {
            await fetch(`/my/training/attempts/${attempt.id}/answer`, {
                method: 'POST',
                headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question_id: questionId,
                    option_ids: answer.option_ids,
                    text: answer.text,
                }),
                credentials: 'include',
            });
            setSavedAt(Date.now());
        } catch {
            // Сүлжээ тасарсан ч илгээх үед бүх хариулт дахин явна
        } finally {
            setSaving(false);
        }
    }

    function setAnswer(q: Question, next: Answer) {
        setAnswers((prev) => ({ ...prev, [q.id]: next }));
        void persist(q.id, next);
    }

    function goTo(id: number) {
        cards.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setOpenNav(false);
    }

    /** Дараагийн хариулаагүй асуулт руу үсэрнэ. */
    function nextUnanswered() {
        const from = questions.findIndex((q) => q.id === current);
        const next = questions.slice(from + 1).find((q) => !answeredIds.has(q.id))
            ?? questions.find((q) => !answeredIds.has(q.id));

        if (next) goTo(next.id);
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Шалгалт', href: '/my/training/exams' },
        { title: exam.title, href: `/my/training/exams/${exam.id}` },
    ];

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title={exam.title} />

            <MyScroll className="bg-[var(--my-page-bg)] md:bg-transparent">
            {/* ── Тогтмол толгой ─────────────────────────────────────────── */}
            <div className="sticky top-0 z-20 border-b border-border/60 bg-gradient-to-b from-card/85 to-card/65 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.5)] backdrop-blur-xl md:top-16">
                <div className="flex w-full items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8 2xl:px-10">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="truncate text-[13px] font-bold leading-tight">{exam.title}</p>
                        </div>
                        <p className="mt-0.5 flex items-center gap-2 text-[10.5px] text-muted-foreground">
                            <span className="tabular-nums">{answeredCount}/{questions.length} хариулсан</span>
                            {saving ? (
                                <span className="inline-flex items-center gap-1">
                                    <Loader2 className="size-2.5 animate-spin" />
                                    хадгалж байна
                                </span>
                            ) : savedAt ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <Cloud className="size-2.5" />
                                    хадгалагдсан
                                </span>
                            ) : null}
                        </p>
                    </div>

                    {left !== null && <Timer left={left} ratio={timeRatio} urgent={urgent} />}

                    <button
                        type="button"
                        onClick={() => submit()}
                        disabled={sending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-2 text-[12.5px] font-bold text-white shadow-lg shadow-violet-600/25 ring-1 ring-inset ring-white/15 transition hover:shadow-violet-600/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                        Илгээх
                    </button>
                </div>

                <div className="h-[3px] bg-muted/60">
                    <div
                        className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.55)] transition-[width] duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Дэвсгэрийн зөөлөн туяа — хуудсанд гүн өгнө */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(139,92,246,0.10),transparent_70%)]"
            />

            <div className="w-full gap-4 px-4 py-4 sm:px-6 lg:flex lg:items-start lg:px-8 2xl:gap-6 2xl:px-10">
                {/* ── Асуултууд ──────────────────────────────────────────── */}
                <div className="min-w-0 flex-1 space-y-3">
                    {urgent && (
                        <p className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-[12px] font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                            <AlertTriangle className="size-3.5 shrink-0" />
                            Хугацаа дуусах гэж байна. Дуусмагц автоматаар илгээгдэнэ.
                        </p>
                    )}

                    {/* Гар утсанд — навигацийг эвхэгддэг болгоно */}
                    <div className="lg:hidden">
                        <button
                            type="button"
                            onClick={() => setOpenNav((v) => !v)}
                            className="flex w-full items-center justify-between rounded-xl border bg-card px-3 py-2 text-[12px] font-semibold shadow-sm"
                        >
                            <span>Асуултын жагсаалт · {answeredCount}/{questions.length}</span>
                            {openNav ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </button>

                        {openNav && (
                            <div className="mt-2 rounded-xl border bg-card p-3 shadow-sm">
                                <Palette
                                    questions={questions}
                                    answered={answeredIds}
                                    flags={flags}
                                    current={current}
                                    onPick={goTo}
                                />
                            </div>
                        )}
                    </div>

                    {questions.map((q, i) => (
                        <QuestionCard
                            key={q.id}
                            ref={(el) => { cards.current[q.id] = el; }}
                            index={i + 1}
                            question={q}
                            answer={answers[q.id]}
                            answered={answeredIds.has(q.id)}
                            flagged={flags.includes(q.id)}
                            active={current === q.id}
                            onFlag={() => toggleFlag(q.id)}
                            onChange={(next) => setAnswer(q, next)}
                        />
                    ))}

                    <button
                        type="button"
                        onClick={() => submit()}
                        disabled={sending}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-violet-600/25 ring-1 ring-inset ring-white/15 transition hover:shadow-violet-600/40 hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Шалгалтыг илгээх
                    </button>
                </div>

                {/* ── Баруун талын навигаци ──────────────────────────────── */}
                <aside className="hidden w-72 shrink-0 lg:block">
                    <div className="sticky top-32 space-y-3">
                        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-lg shadow-black/[0.03] dark:shadow-black/20">
                            <header className="border-b border-border/70 bg-gradient-to-r from-violet-50/70 to-transparent px-3.5 py-2.5 dark:from-violet-500/[0.07]">
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Асуултууд</h2>
                                <p className="mt-0.5 text-[12.5px] font-bold tabular-nums">
                                    {answeredCount}<span className="text-muted-foreground">/{questions.length}</span>
                                    <span className="ml-1 text-[10px] font-medium text-muted-foreground">хариулсан · {remaining} үлдсэн</span>
                                </p>
                            </header>

                            <div className="p-3">
                                <Palette
                                    questions={questions}
                                    answered={answeredIds}
                                    flags={flags}
                                    current={current}
                                    onPick={goTo}
                                />

                                <div className="mt-3 space-y-1 border-t pt-2.5 text-[10px] text-muted-foreground">
                                    <Legend className="bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-sm shadow-violet-600/30" label="Хариулсан" />
                                    <Legend className="border border-dashed border-border bg-muted" label="Хариулаагүй" />
                                    <Legend className="bg-amber-400 shadow-sm shadow-amber-400/40" label="Тэмдэглэсэн" />
                                </div>
                            </div>
                        </div>

                        {/* Явцын товч дүгнэлт */}
                        <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-lg shadow-black/[0.03] dark:shadow-black/20">
                            <div className="flex items-center gap-3">
                                <ProgressRing percent={progress} size={44} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Явц</p>
                                    <p className="text-[13px] font-bold tabular-nums">
                                        {answeredCount}<span className="text-muted-foreground">/{questions.length}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-[width] duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            {remaining > 0 ? (
                                <button
                                    type="button"
                                    onClick={nextUnanswered}
                                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                                >
                                    Дараагийн хариулаагүй
                                </button>
                            ) : (
                                <p className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-1.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    <CheckCircle2 className="size-3.5" />
                                    Бүх асуултад хариуллаа
                                </p>
                            )}

                            {flags.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const first = questions.find((q) => flags.includes(q.id));

                                        if (first) goTo(first.id);
                                    }}
                                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 py-1.5 text-[10.5px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-500/20 transition hover:bg-amber-500/15 dark:text-amber-300"
                                >
                                    <Flag className="size-3 fill-current" />
                                    {flags.length} тэмдэглэсэн асуулт
                                </button>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
            </MyScroll>
        </MyLayout>
    );
}

/* ── Хэсгүүд ───────────────────────────────────────────────────────────── */

/** Хугацааны тоолуур — бөгжөөр үлдсэн хугацааг харуулна. */
function Timer({ left, ratio, urgent }: { left: number; ratio: number | null; urgent: boolean }) {
    const r    = 15;
    const circ = 2 * Math.PI * r;

    return (
        <div
            className={cn(
                'flex items-center gap-2 rounded-xl px-2.5 py-1.5 font-mono text-[13px] font-bold tabular-nums',
                urgent ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-muted',
            )}
        >
            <span className="relative grid size-8 place-items-center">
                <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                    <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" className="stroke-current opacity-20" />
                    {ratio !== null && (
                        <circle
                            cx="18" cy="18" r={r} fill="none" strokeWidth="3" strokeLinecap="round"
                            className="stroke-current transition-[stroke-dashoffset] duration-1000 ease-linear"
                            strokeDasharray={circ}
                            strokeDashoffset={circ * (1 - ratio)}
                        />
                    )}
                </svg>
                <span className={cn('size-1.5 rounded-full bg-current', urgent && 'animate-pulse')} />
            </span>
            {clock(left)}
        </div>
    );
}

/** Асуултын дугааруудын тор — хариулсан нь дүүрч будагдана. */
function Palette({ questions, answered, flags, current, onPick }: {
    questions: Question[];
    answered: Set<number>;
    flags: number[];
    current: number;
    onPick: (id: number) => void;
}) {
    return (
        <div className="grid grid-cols-5 gap-1.5">
            {questions.map((q, i) => {
                const done   = answered.has(q.id);
                const marked = flags.includes(q.id);

                return (
                    <button
                        key={q.id}
                        type="button"
                        onClick={() => onPick(q.id)}
                        title={marked ? 'Тэмдэглэсэн' : done ? 'Хариулсан' : 'Хариулаагүй'}
                        className={cn(
                            'relative grid aspect-square place-items-center rounded-xl text-[11.5px] font-bold tabular-nums transition duration-200 hover:-translate-y-0.5',
                            done
                                ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/30 ring-1 ring-inset ring-white/15 hover:shadow-lg hover:shadow-violet-600/40'
                                : 'border border-dashed border-border bg-muted/50 text-muted-foreground hover:border-violet-300 hover:bg-muted',
                            current === q.id && 'ring-2 ring-violet-400/80 ring-offset-2 ring-offset-card',
                        )}
                    >
                        {i + 1}
                        {marked && (
                            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-400 ring-2 ring-card" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function Legend({ className, label }: { className: string; label: string }) {
    return (
        <p className="flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded', className)} />
            {label}
        </p>
    );
}

/* ── Нэг асуулт ────────────────────────────────────────────────────────── */
function QuestionCard({
    ref, index, question, answer, answered, flagged, active, onFlag, onChange,
}: {
    ref: (el: HTMLDivElement | null) => void;
    index: number;
    question: Question;
    answer: Answer;
    answered: boolean;
    flagged: boolean;
    active: boolean;
    onFlag: () => void;
    onChange: (next: Answer) => void;
}) {
    const multiple = question.type === 'multiple';

    function toggle(optionId: number) {
        const has = answer.option_ids.includes(optionId);

        onChange({
            ...answer,
            option_ids: multiple
                ? has
                    ? answer.option_ids.filter((id) => id !== optionId)
                    : [...answer.option_ids, optionId]
                : [optionId],
        });
    }

    const clear = () => onChange({ option_ids: [], text: '' });

    return (
        <div
            ref={ref}
            data-qid={question.id}
            className={cn(
                'relative scroll-mt-32 overflow-hidden rounded-2xl border bg-card transition-all duration-300',
                active
                    ? 'border-violet-300/70 shadow-[0_18px_40px_-24px_rgba(76,29,149,0.45)] ring-1 ring-violet-500/10 dark:border-violet-500/40 dark:shadow-black/40'
                    : 'border-border/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_28px_-20px_rgba(15,23,42,0.35)]',
            )}
        >
            {/* Идэвхтэй асуултын зүүн ирмэгийн тууз */}
            <span
                className={cn(
                    'absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-violet-600 to-fuchsia-500 transition-opacity duration-300',
                    active ? 'opacity-100' : 'opacity-0',
                )}
            />

            {/* Асуулт дээрээ, хариултууд доороо */}
            <div className="flex flex-col">
                {/* Асуултын хэсэг */}
                <div className="relative flex items-start gap-3 border-b border-border/70 px-4 py-3.5">
                    {/* Буланд тусах туяа — картад гүн өгнө */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(139,92,246,0.09),transparent_60%)]"
                    />

                    <span className={cn(
                        'relative grid size-7 shrink-0 place-items-center rounded-xl text-[12px] font-bold tabular-nums transition duration-300',
                        answered
                            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/35 ring-1 ring-inset ring-white/20'
                            : 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
                    )}>
                        {index}
                    </span>

                    <div className="relative min-w-0 flex-1">
                        <p className="whitespace-pre-line text-[13.5px] font-semibold leading-relaxed tracking-[-0.01em]">
                            {question.body}
                        </p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="rounded-full bg-muted px-1.5 py-0.5 font-semibold tabular-nums">
                                {question.points} оноо
                            </span>
                            {multiple && (
                                <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 font-semibold text-violet-600 dark:text-violet-300">
                                    олон хариулттай
                                </span>
                            )}
                            {question.type === 'text' && (
                                <span className="rounded-full bg-sky-500/10 px-1.5 py-0.5 font-semibold text-sky-600 dark:text-sky-300">
                                    задгай хариулт
                                </span>
                            )}
                            {answered && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-300">
                                    <Check className="size-2.5" />
                                    хариулсан
                                </span>
                            )}
                        </p>

                        {question.image_url && (
                            <img src={question.image_url} alt="" className="mt-2.5 max-h-56 rounded-lg object-contain" />
                        )}
                    </div>

                    <div className="relative flex shrink-0 items-center gap-0.5">
                        {answered && (
                            <button
                                type="button"
                                onClick={clear}
                                title="Хариултыг арилгах"
                                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-rose-600"
                            >
                                <Trash2 className="size-3.5" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onFlag}
                            title={flagged ? 'Тэмдэглэгээг авах' : 'Эргэж харахаар тэмдэглэх'}
                            className={cn(
                                'rounded-lg p-1.5 transition hover:bg-muted',
                                flagged ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500',
                            )}
                        >
                            <Flag className={cn('size-3.5', flagged && 'fill-current')} />
                        </button>
                    </div>
                </div>

                {/* Хариултын хэсэг — асуултын доор */}
                <div className="bg-gradient-to-b from-muted/20 to-transparent p-4">
                {question.type === 'text' ? (
                    <textarea
                        value={answer.text}
                        onChange={(e) => onChange({ ...answer, text: e.target.value })}
                        rows={4}
                        placeholder="Хариултаа бичнэ үү…"
                        className={cn(FIELD, 'resize-none text-[13px]')}
                    />
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {question.options.map((o, i) => {
                            const checked = answer.option_ids.includes(o.id);

                            return (
                                <button
                                    key={o.id}
                                    type="button"
                                    onClick={() => toggle(o.id)}
                                    className={cn(
                                        'group/opt relative flex w-full items-center gap-3 overflow-hidden rounded-xl border bg-card px-3.5 py-3 text-left text-[13px] transition-all duration-200',
                                        checked
                                            ? 'border-violet-400/60 font-medium shadow-[0_4px_16px_-6px_rgba(139,92,246,0.55)] ring-1 ring-inset ring-violet-500/25 dark:border-violet-500/50'
                                            : 'border-border/70 hover:-translate-y-px hover:border-violet-300/70 hover:shadow-md hover:shadow-violet-900/[0.06]',
                                    )}
                                >
                                    {/* Сонгосон үеийн дэвсгэр ба зүүн ирмэгийн тууз */}
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-500/[0.12] via-fuchsia-500/[0.06] to-transparent transition-opacity duration-300',
                                            checked ? 'opacity-100' : 'opacity-0 group-hover/opt:opacity-50',
                                        )}
                                    />
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-violet-600 to-fuchsia-500 transition-opacity duration-300',
                                            checked ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />

                                    <span
                                        className={cn(
                                            'relative grid size-6 shrink-0 place-items-center border text-[10.5px] font-bold transition duration-200',
                                            multiple ? 'rounded-lg' : 'rounded-full',
                                            checked
                                                ? 'border-transparent bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/40 ring-1 ring-inset ring-white/20'
                                                : 'border-border bg-muted/40 text-muted-foreground group-hover/opt:border-violet-300 group-hover/opt:text-violet-600',
                                        )}
                                    >
                                        {checked ? <Check className="size-3.5" /> : (LETTERS[i] ?? i + 1)}
                                    </span>

                                    <span className="relative min-w-0 flex-1 leading-snug">{o.body}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}
