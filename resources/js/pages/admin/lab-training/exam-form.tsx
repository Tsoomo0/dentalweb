import {
    AREA, BTN, CTA, Check, FIELD, FILE_INPUT, FieldError, GLASS, HeroShell, INPUT,
    LABEL,
} from '@/components/lab-admin-ui';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CalendarClock, CheckCircle2, Clock,
    Copy, FileQuestion, GraduationCap, Image as ImageIcon, ListChecks, Lock, Plus,
    Settings2, Trash2, X,
} from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';

/**
 * Админ тал — шалгалт бэлдэх бүтэн хуудас.
 *
 * ДҮРСЛЭЛИЙН БОДОЛ: 10-20 асуулттай шалгалт бэлдэх нь модалд багтахгүй ажил.
 * Тиймээс зүүн талд наалдсан тохиргоо, баруун талд асуултын урт жагсаалт
 * гэсэн хоёр багана болгосон — тохиргоо нүднээс алга болохгүй, асуулт
 * доошоо чөлөөтэй сунана. Доод талд наалдсан зурвас нь нийт оноо, дутуу
 * зүйлийг байнга хэлж, "хадгалаад л алдаа гарах" байдлыг арилгана.
 */

interface OptionDraft {
    body: string;
    is_correct: boolean;
}

interface QDraft {
    /** Зөвхөн browser талын тогтмол дугаар — зураг, дараалал үүгээр холбогдоно. */
    uid: string;
    type: string;
    body: string;
    points: number;
    explanation: string;
    image_url: string | null;
    options: OptionDraft[];
}

interface Course {
    id: number;
    title: string;
    lessons: { id: number; title: string }[];
}

interface Props {
    exam: {
        id: number;
        title: string;
        description: string | null;
        course_id: number | null;
        lesson_id: number | null;
        duration_minutes: number | null;
        pass_percent: number;
        shuffle_questions: boolean;
        shuffle_options: boolean;
        show_answers: string;
        opens_at: string | null;
        closes_at: string | null;
        is_published: boolean;
        attempts_count: number;
        questions: Omit<QDraft, 'uid'>[];
    } | null;
    locked: boolean;
    courses: Course[];
    questionTypes: Record<string, string>;
}

let seq = 0;
const uid = () => `q${++seq}`;

const emptyQuestion = (): QDraft => ({
    uid: uid(),
    type: 'single',
    body: '',
    points: 1,
    explanation: '',
    image_url: null,
    options: [
        { body: '', is_correct: true },
        { body: '', is_correct: false },
    ],
});

const trueFalseOptions = (): OptionDraft[] => [
    { body: 'Үнэн', is_correct: true },
    { body: 'Худал', is_correct: false },
];

/**
 * Сервер талын шалгалттай ЯГ ижил дүрэм.
 *
 * Хадгалахаас өмнө ижил хариултыг өгснөөр хэрэглэгч алдааг илгээлгүйгээр
 * олж засна. Дүрэм өөрчлөгдвөл LabExamController::parseQuestions-тэй хамт
 * шинэчлэх ёстой.
 */
function questionIssue(q: QDraft, index: number): string | null {
    const no = index + 1;

    if (!q.body.trim()) return `${no}-р асуултын текст хоосон байна.`;
    if (q.type === 'text') return null;

    const filled  = q.options.filter((o) => o.body.trim() !== '');
    const correct = filled.filter((o) => o.is_correct);

    if (filled.length < 2) return `${no}-р асуултад дор хаяж 2 сонголт хэрэгтэй.`;
    if (correct.length === 0) return `${no}-р асуултын зөв хариултыг тэмдэглэнэ үү.`;
    if (q.type !== 'multiple' && correct.length > 1) {
        return `${no}-р асуулт зөвхөн нэг зөв хариулттай байх ёстой.`;
    }

    return null;
}

export default function LabExamForm({ exam, locked, courses, questionTypes }: Props) {
    const [questions, setQuestions] = useState<QDraft[]>(
        exam?.questions.length
            ? exam.questions.map((q) => ({ ...q, uid: uid() }))
            : [emptyQuestion()],
    );

    // Зургийг асуултын uid-аар барина — дараалал солиход зөв асуулт дээрээ үлдэнэ
    const [images, setImages] = useState<Record<string, File>>({});

    const { data, setData, post, transform, processing, errors } = useForm({
        lab_course_id: exam?.course_id ?? '',
        lab_lesson_id: exam?.lesson_id ?? '',
        title: exam?.title ?? '',
        description: exam?.description ?? '',
        duration_minutes: exam?.duration_minutes ?? '',
        pass_percent: exam?.pass_percent ?? 60,
        shuffle_questions: exam?.shuffle_questions ?? true,
        shuffle_options: exam?.shuffle_options ?? true,
        show_answers: exam?.show_answers ?? 'after_submit',
        opens_at: exam?.opens_at ?? '',
        closes_at: exam?.closes_at ?? '',
        is_published: exam?.is_published ?? false,
        questions: '',
        question_images: {} as Record<string, File>,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Админ', href: '/admin/dashboard' },
        { title: 'Шалгалт', href: '/admin/lab-training/exams' },
        { title: exam ? exam.title : 'Шинэ шалгалт', href: '/admin/lab-training/exams' },
    ];

    const lessons  = courses.find((c) => String(c.id) === String(data.lab_course_id))?.lessons ?? [];
    const maxScore = questions.reduce((n, q) => n + (Number(q.points) || 0), 0);
    const issues   = questions.map(questionIssue).filter((m): m is string => m !== null);
    const ready    = data.title.trim() !== '' && issues.length === 0;

    function patch(uidKey: string, next: Partial<QDraft>) {
        setQuestions((qs) => qs.map((q) => (q.uid === uidKey ? { ...q, ...next } : q)));
    }

    function changeType(q: QDraft, type: string) {
        patch(q.uid, {
            type,
            options:
                type === 'truefalse'
                    ? trueFalseOptions()
                    : type === 'text'
                      ? []
                      : q.options.length
                        ? q.options
                        : emptyQuestion().options,
        });
    }

    /** Асуултыг дээш/доош нэг байраар зөөнө. */
    function move(index: number, delta: number) {
        setQuestions((qs) => {
            const to = index + delta;

            if (to < 0 || to >= qs.length) return qs;

            const next = [...qs];
            [next[index], next[to]] = [next[to], next[index]];

            return next;
        });
    }

    /** Ижил төстэй асуултуудыг хурдан бэлдэх — хуулбар нь шинэ uid авна. */
    function duplicate(index: number) {
        setQuestions((qs) => {
            const copy = {
                ...qs[index],
                uid: uid(),
                image_url: null,
                options: qs[index].options.map((o) => ({ ...o })),
            };

            return [...qs.slice(0, index + 1), copy, ...qs.slice(index + 1)];
        });
    }

    function remove(uidKey: string) {
        setQuestions((qs) => qs.filter((q) => q.uid !== uidKey));
        setImages((prev) => {
            const next = { ...prev };
            delete next[uidKey];

            return next;
        });
    }

    function submit(e: FormEvent) {
        e.preventDefault();

        // Асуулт JSON мөр болж, зураг нь ЭЦСИЙН дараалалын индексээр явна —
        // сервер question_images[i]-г i дэх асуулттай хослуулдаг.
        const byIndex: Record<string, File> = {};

        questions.forEach((q, i) => {
            if (images[q.uid]) byIndex[String(i)] = images[q.uid];
        });

        transform((d) => ({
            ...d,
            // uid бол зөвхөн browser талын түлхүүр — сервер рүү явуулахгүй
            questions: JSON.stringify(questions.map((q) => ({
                type: q.type,
                body: q.body,
                points: q.points,
                explanation: q.explanation,
                options: q.options,
            }))),
            question_images: byIndex,
        }));

        post(exam ? `/admin/lab-training/exams/${exam.id}` : '/admin/lab-training/exams', {
            forceFormData: true,
            preserveScroll: true,
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={exam ? `${exam.title} — засах` : 'Шинэ шалгалт'} />

            <form onSubmit={submit}>
                {/* ── Кино маягийн толгой ────────────────────────────────── */}
                <HeroShell>
                    <div className="px-4 pb-5 pt-6 sm:px-6 sm:pt-8">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div className="min-w-0">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/90">
                                    <GraduationCap className="size-3" />
                                    Лабораторийн сургалт · Шалгалт
                                </p>

                                <h1 className="mt-1.5 truncate text-2xl font-black tracking-tight sm:text-[28px]">
                                    {exam ? exam.title : 'Шинэ шалгалт'}
                                </h1>

                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <HeroChip icon={FileQuestion}>{questions.length} асуулт</HeroChip>
                                    <HeroChip icon={ListChecks}>{maxScore} оноо</HeroChip>
                                    <HeroChip icon={CheckCircle2}>Тэнцэх {data.pass_percent}%</HeroChip>
                                    <HeroChip icon={Clock}>
                                        {data.duration_minutes ? `${data.duration_minutes} мин` : 'Хугацаагүй'}
                                    </HeroChip>
                                    {data.is_published
                                        ? <HeroChip tone="good">Нийтлэгдэнэ</HeroChip>
                                        : <HeroChip>Ноорог</HeroChip>}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                                <Link href="/admin/lab-training/exams" className={GLASS}>
                                    <ArrowLeft className="size-3.5" />
                                    Болих
                                </Link>
                            </div>
                        </div>
                    </div>
                </HeroShell>

                {locked && (
                    <div className="mx-4 mt-4 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-3 text-xs text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300 sm:mx-6">
                        <Lock className="mt-px size-4 shrink-0" />
                        <span>
                            <strong className="font-bold">Асуулт түгжигдсэн.</strong> Энэ шалгалтыг аль хэдийн
                            өгсөн хүн байна. Асуултыг өөрчилвөл өмнөх оноо утгагүй болох тул зөвхөн тохиргоог
                            засах боломжтой. Асуултаа солих бол шинэ шалгалт үүсгэнэ үү.
                        </span>
                    </div>
                )}

                <div className="grid gap-4 px-4 py-4 sm:px-6 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
                    {/* ── Зүүн багана: тохиргоо ─────────────────────────── */}
                    <div className="flex flex-col gap-4 xl:sticky xl:top-4">
                        <Panel icon={Settings2} title="Үндсэн">
                            <div>
                                <label className={LABEL}>Гарчиг</label>
                                <input
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className={FIELD}
                                    placeholder="Жишээ: Керамик нугалалтын шалгалт"
                                    autoFocus
                                />
                                <FieldError message={errors.title} />
                            </div>

                            <div>
                                <label className={LABEL}>Тайлбар</label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                    className={AREA}
                                    placeholder="Шалгалтын өмнө ажилтанд харагдана"
                                />
                            </div>

                            <div>
                                <label className={LABEL}>Сургалт</label>
                                <select
                                    value={data.lab_course_id}
                                    onChange={(e) => setData((p) => ({ ...p, lab_course_id: e.target.value, lab_lesson_id: '' }))}
                                    className={FIELD}
                                >
                                    <option value="">— Сонгоогүй —</option>
                                    {courses.map((c) => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={LABEL}>Хичээл (заавал биш)</label>
                                <select
                                    value={data.lab_lesson_id}
                                    onChange={(e) => setData('lab_lesson_id', e.target.value)}
                                    className={FIELD}
                                    disabled={lessons.length === 0}
                                >
                                    <option value="">— Бүх хичээл —</option>
                                    {lessons.map((l) => (
                                        <option key={l.id} value={l.id}>{l.title}</option>
                                    ))}
                                </select>
                            </div>
                        </Panel>

                        <Panel icon={ListChecks} title="Дүрэм">
                            <div className="grid grid-cols-3 gap-2.5">
                                <div>
                                    <label className={LABEL}>Хугацаа</label>
                                    <input
                                        type="number" min={1} max={600}
                                        value={data.duration_minutes}
                                        onChange={(e) => setData('duration_minutes', e.target.value)}
                                        placeholder="∞"
                                        className={FIELD}
                                    />
                                    <p className="mt-1 text-[10px] text-muted-foreground">минут</p>
                                </div>
                                <div>
                                    <label className={LABEL}>Тэнцэх</label>
                                    <input
                                        type="number" min={1} max={100}
                                        value={data.pass_percent}
                                        onChange={(e) => setData('pass_percent', Number(e.target.value))}
                                        className={FIELD}
                                    />
                                    <p className="mt-1 text-[10px] text-muted-foreground">хувь</p>
                                </div>
                            </div>

                            <div>
                                <label className={LABEL}>Зөв хариулт харуулах</label>
                                <select
                                    value={data.show_answers}
                                    onChange={(e) => setData('show_answers', e.target.value)}
                                    className={FIELD}
                                >
                                    <option value="never">Хэзээ ч харуулахгүй</option>
                                    <option value="after_submit">Илгээсний дараа</option>
                                    <option value="after_pass">Зөвхөн тэнцсэн үед</option>
                                </select>
                            </div>
                        </Panel>

                        <Panel icon={CalendarClock} title="Нээх хугацаа">
                            <div>
                                <label className={LABEL}>Нээх огноо</label>
                                <input
                                    type="datetime-local"
                                    value={data.opens_at}
                                    onChange={(e) => setData('opens_at', e.target.value)}
                                    className={FIELD}
                                />
                            </div>

                            <div>
                                <label className={LABEL}>Хаах огноо</label>
                                <input
                                    type="datetime-local"
                                    value={data.closes_at}
                                    onChange={(e) => setData('closes_at', e.target.value)}
                                    className={FIELD}
                                />
                                <FieldError message={errors.closes_at} />
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                    Хоосон орхивол хугацаагүй нээлттэй.
                                </p>
                            </div>

                            <div className="space-y-2.5 border-t pt-3">
                                <Check
                                    checked={data.shuffle_questions}
                                    onChange={(v) => setData('shuffle_questions', v)}
                                    label="Асуулт холих"
                                    hint="Хүн бүрд өөр дараалал."
                                />
                                <Check
                                    checked={data.shuffle_options}
                                    onChange={(v) => setData('shuffle_options', v)}
                                    label="Хариулт холих"
                                    hint="Сонголтууд байраа солино."
                                />
                                <Check
                                    checked={data.is_published}
                                    onChange={(v) => setData('is_published', v)}
                                    label="Нийтлэх"
                                    hint="Лаб ажилтнуудад нээгдэж, мэдэгдэл очно."
                                />
                            </div>
                        </Panel>
                    </div>

                    {/* ── Баруун багана: асуултууд ──────────────────────── */}
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card px-3.5 py-3 shadow-sm">
                            <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight">
                                <FileQuestion className="size-4 text-muted-foreground" />
                                Асуулт
                            </h2>
                            <span className="rounded-full bg-muted px-2 text-[11px] font-semibold leading-5 tabular-nums text-muted-foreground">
                                {questions.length}
                            </span>
                            <span className="text-[11px] text-muted-foreground">нийт {maxScore} оноо</span>

                            {!locked && (
                                <button
                                    type="button"
                                    onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
                                    className={cn(CTA, 'ml-auto')}
                                >
                                    <Plus className="size-3.5" />
                                    Асуулт нэмэх
                                </button>
                            )}
                        </div>

                        {errors.questions && (
                            <p className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-[11px] font-medium text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
                                {errors.questions}
                            </p>
                        )}

                        {questions.map((q, i) => (
                            <QuestionCard
                                key={q.uid}
                                index={i}
                                total={questions.length}
                                question={q}
                                issue={questionIssue(q, i)}
                                questionTypes={questionTypes}
                                locked={locked}
                                image={images[q.uid]}
                                onPatch={(next) => patch(q.uid, next)}
                                onType={(type) => changeType(q, type)}
                                onImage={(file) =>
                                    setImages((prev) => {
                                        const next = { ...prev };
                                        if (file) next[q.uid] = file;
                                        else delete next[q.uid];

                                        return next;
                                    })
                                }
                                onMove={(delta) => move(i, delta)}
                                onDuplicate={() => duplicate(i)}
                                onRemove={() => remove(q.uid)}
                            />
                        ))}

                        {!locked && (
                            <button
                                type="button"
                                onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
                                className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-dashed text-xs font-medium text-muted-foreground transition hover:border-solid hover:bg-muted hover:text-foreground"
                            >
                                <Plus className="size-4" />
                                Асуулт нэмэх
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Наалдсан доод зурвас ──────────────────────────────── */}
                <div className="sticky bottom-0 z-20 border-t bg-card/95 px-4 py-3 backdrop-blur-md sm:px-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            {issues.length > 0 ? (
                                <>
                                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="size-4" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-xs font-semibold">
                                            {issues.length} зүйл дутуу байна
                                        </span>
                                        <span className="block truncate text-[11px] text-muted-foreground">
                                            {issues[0]}
                                        </span>
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="size-4" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-xs font-semibold">Бэлэн боллоо</span>
                                        <span className="block truncate text-[11px] text-muted-foreground">
                                            {questions.length} асуулт · {maxScore} оноо · тэнцэх {data.pass_percent}%
                                        </span>
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <Link href="/admin/lab-training/exams" className={BTN}>Болих</Link>
                            <button
                                type="submit"
                                disabled={processing || !ready}
                                className={cn(CTA, 'h-9 px-4')}
                            >
                                {processing ? 'Хадгалж байна…' : exam ? 'Хадгалах' : 'Шалгалт үүсгэх'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}

/* ── Толгойн жижиг шошго ───────────────────────────────────────────────── */
function HeroChip({ icon: Icon, tone, children }: {
    icon?: typeof Clock; tone?: 'good'; children: ReactNode;
}) {
    return (
        <span className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold backdrop-blur-sm',
            tone === 'good'
                ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200'
                : 'border-white/15 bg-white/10 text-white/75',
        )}>
            {Icon && <Icon className="size-3 shrink-0" />}
            {children}
        </span>
    );
}

/* ── Тохиргооны самбар ─────────────────────────────────────────────────── */
function Panel({ icon: Icon, title, children }: {
    icon: typeof Settings2; title: string; children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <h2 className="flex items-center gap-2 border-b px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <Icon className="size-3.5" />
                {title}
            </h2>
            <div className="space-y-3 p-3.5">{children}</div>
        </section>
    );
}

/* ── Нэг асуултын карт ─────────────────────────────────────────────────── */
/**
 * Зөв хариултыг сонгох товч нь хэлбэрээрээ л төрлөө хэлнэ — нэг зөв хариулт
 * дугуй, олон зөв хариулт дөрвөлжин. Ингэснээр тайлбар уншихгүйгээр ойлгоно.
 * Дутуу зүйл байвал картын дээр шар зурвас гарч, аль нь дутууг шууд хэлнэ.
 */
function QuestionCard({
    index, total, question: q, issue, questionTypes, locked, image,
    onPatch, onType, onImage, onMove, onDuplicate, onRemove,
}: {
    index: number;
    total: number;
    question: QDraft;
    issue: string | null;
    questionTypes: Record<string, string>;
    locked: boolean;
    image?: File;
    onPatch: (next: Partial<QDraft>) => void;
    onType: (type: string) => void;
    onImage: (file: File | null) => void;
    onMove: (delta: number) => void;
    onDuplicate: () => void;
    onRemove: () => void;
}) {
    return (
        <article className={cn(
            'overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors',
            issue ? 'border-amber-300/70 dark:border-amber-500/30' : undefined,
        )}>
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-[11px] font-bold tabular-nums text-violet-600 dark:text-violet-300">
                    {index + 1}
                </span>

                <select
                    value={q.type}
                    onChange={(e) => onType(e.target.value)}
                    disabled={locked}
                    className={cn(INPUT, 'w-auto')}
                >
                    {Object.entries(questionTypes).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>

                <span className="flex items-center gap-1.5">
                    <input
                        type="number" min={1} max={100}
                        value={q.points}
                        onChange={(e) => onPatch({ points: Number(e.target.value) })}
                        disabled={locked}
                        className={cn(INPUT, 'w-16')}
                        title="Оноо"
                    />
                    <span className="text-[11px] text-muted-foreground">оноо</span>
                </span>

                {!locked && (
                    <span className="ml-auto flex items-center gap-0.5">
                        <Tool icon={ArrowUp} label="Дээш зөөх" onClick={() => onMove(-1)} disabled={index === 0} />
                        <Tool icon={ArrowDown} label="Доош зөөх" onClick={() => onMove(1)} disabled={index === total - 1} />
                        <Tool icon={Copy} label="Хуулбарлах" onClick={onDuplicate} />
                        <Tool icon={Trash2} label="Устгах" onClick={onRemove} disabled={total === 1} danger />
                    </span>
                )}
            </div>

            {issue && (
                <p className="flex items-center gap-1.5 border-b border-amber-200 bg-amber-50/70 px-3 py-1.5 text-[11px] font-medium text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                    <AlertTriangle className="size-3 shrink-0" />
                    {issue}
                </p>
            )}

            <div className="space-y-3 p-3">
                <textarea
                    value={q.body}
                    onChange={(e) => onPatch({ body: e.target.value })}
                    disabled={locked}
                    rows={2}
                    placeholder="Асуултын текст"
                    className={AREA}
                />

                {!locked && (
                    <div>
                        <label className={cn(LABEL, 'flex items-center gap-1.5')}>
                            <ImageIcon className="size-3" />
                            Зураг (заавал биш)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => onImage(e.target.files?.[0] ?? null)}
                            className={FILE_INPUT}
                        />

                        {image ? (
                            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-3" />
                                {image.name} — хадгалахад солигдоно
                            </p>
                        ) : q.image_url ? (
                            <img src={q.image_url} alt="" className="mt-2 h-20 rounded-lg border object-contain" />
                        ) : null}
                    </div>
                )}

                {/* Сонголтууд */}
                {q.type !== 'text' && (
                    <div className="space-y-1.5">
                        <p className={LABEL}>
                            {q.type === 'multiple' ? 'Зөв хариултуудыг тэмдэглэнэ' : 'Зөв хариултыг тэмдэглэнэ'}
                        </p>

                        {q.options.map((o, k) => (
                            <div key={k} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={locked}
                                    onClick={() =>
                                        onPatch({
                                            options: q.options.map((x, m) =>
                                                q.type === 'multiple'
                                                    ? m === k ? { ...x, is_correct: !x.is_correct } : x
                                                    : { ...x, is_correct: m === k },
                                            ),
                                        })
                                    }
                                    title="Зөв хариулт болгох"
                                    className={cn(
                                        'grid size-6 shrink-0 place-items-center border transition active:scale-95',
                                        'disabled:pointer-events-none disabled:opacity-60',
                                        q.type === 'multiple' ? 'rounded-md' : 'rounded-full',
                                        o.is_correct
                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                            : 'text-transparent hover:border-emerald-400',
                                    )}
                                >
                                    <CheckCircle2 className="size-3.5" />
                                </button>

                                <input
                                    value={o.body}
                                    onChange={(e) =>
                                        onPatch({
                                            options: q.options.map((x, m) => (m === k ? { ...x, body: e.target.value } : x)),
                                        })
                                    }
                                    disabled={locked || q.type === 'truefalse'}
                                    placeholder={`Хариулт ${k + 1}`}
                                    className={cn(FIELD, o.is_correct && 'border-emerald-400/60 bg-emerald-500/[0.04]')}
                                />

                                {q.options.length > 2 && q.type !== 'truefalse' && !locked && (
                                    <button
                                        type="button"
                                        onClick={() => onPatch({ options: q.options.filter((_, m) => m !== k) })}
                                        title="Сонголт устгах"
                                        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600 active:scale-95 dark:hover:text-rose-400"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}

                        {q.type !== 'truefalse' && !locked && (
                            <button
                                type="button"
                                onClick={() => onPatch({ options: [...q.options, { body: '', is_correct: false }] })}
                                className="flex h-8 items-center gap-1 rounded-lg border border-dashed px-2.5 text-[11px] text-muted-foreground transition hover:border-solid hover:bg-muted hover:text-foreground"
                            >
                                <Plus className="size-3" />
                                Сонголт нэмэх
                            </button>
                        )}
                    </div>
                )}

                {q.type === 'text' && (
                    <p className="rounded-lg border border-dashed px-2.5 py-2 text-[11px] text-muted-foreground">
                        Задгай хариултыг систем автоматаар үнэлэхгүй — үр дүнгийн хуудсанд гараар оноо өгнө.
                    </p>
                )}

                <input
                    value={q.explanation}
                    onChange={(e) => onPatch({ explanation: e.target.value })}
                    disabled={locked}
                    placeholder="Тайлбар — зөв хариулттай хамт харагдана (заавал биш)"
                    className={cn(FIELD, 'text-xs')}
                />
            </div>
        </article>
    );
}

/** Асуултын толгой дээрх жижиг үйлдлийн товч. */
function Tool({ icon: Icon, label, onClick, disabled, danger }: {
    icon: typeof Copy; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={label}
            className={cn(
                'grid size-7 shrink-0 place-items-center rounded-md transition active:scale-95',
                'disabled:pointer-events-none disabled:opacity-25',
                danger
                    ? 'text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            <Icon className="size-3.5" />
        </button>
    );
}
