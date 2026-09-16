import {
    AvatarRing, BTN, CTA, Empty, FIELD, GLASS, HeroShell, HeroStat, HeroStatGrid,
    INPUT, LABEL, ReachBar, Tag,
} from '@/components/lab-admin-ui';
import LabItemAnalysis, { type Analysis } from '@/components/lab-item-analysis';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft, CheckCircle2, ChevronDown, Clock3, FileQuestion, GraduationCap,
    ListFilter, Search, Target, Trophy, Users, XCircle,
} from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';

/**
 * Админ тал — нэг шалгалтын үр дүн.
 *
 * ДҮРСЛЭЛИЙН БОДОЛ: гол асуулт бол "хэн тэнцсэн, хэнийг гараар үнэлэх ёстой
 * вэ". Тиймээс толгойд тэнцсэн/унасан/үнэлэх гэсэн гурван бүлгийг нэг зурвас
 * дээр харуулж, доор нь мөр бүрийн явцыг цагирагаар өгсөн. Задгай хариулт
 * бүхий оролдлого нь шар туузтай — жагсаалтаас шууд олдоно.
 */

interface Answer {
    id: number;
    question_id: number;
    selected: number[];
    text: string | null;
    is_correct: boolean | null;
    points: number;
    feedback: string | null;
}

interface Attempt {
    id: number;
    user_name: string;
    started_at: string | null;
    submitted_at: string | null;
    score: number;
    max_score: number;
    percent: number;
    is_passed: boolean;
    status: string;
    answers: Answer[];
}

interface Question {
    id: number;
    type: string;
    type_label: string;
    body: string;
    points: number;
    explanation: string | null;
    image_url: string | null;
    options: { id: number; body: string; is_correct: boolean }[];
}

interface Props {
    exam: {
        id: number;
        title: string;
        course_title: string | null;
        lesson_title: string | null;
        pass_percent: number;
        max_score: number;
    };
    questions: Question[];
    attempts: Attempt[];
    analysis: Analysis;
}

type Filter = 'all' | 'passed' | 'failed' | 'pending';

export default function LabExamResults({ exam, questions, attempts, analysis }: Props) {
    const [openId, setOpenId] = useState<number | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery]   = useState('');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Админ', href: '/admin/dashboard' },
        { title: 'Шалгалт', href: '/admin/lab-training/exams' },
        { title: exam.title, href: `/admin/lab-training/exams/${exam.id}/results` },
    ];

    const byId    = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
    const graded  = attempts.filter((a) => a.status === 'graded');
    const pending = attempts.filter((a) => a.status === 'submitted');
    const passed  = graded.filter((a) => a.is_passed);
    const failed  = graded.filter((a) => !a.is_passed);
    const avg     = graded.length > 0
        ? Math.round(graded.reduce((n, a) => n + a.percent, 0) / graded.length)
        : 0;

    // Хамгийн өндөр оноо — багшид "дээд хязгаар хүрсэн үү" гэдгийг хэлнэ
    const best = attempts.reduce((n, a) => Math.max(n, a.percent), 0);

    const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

    const rows = useMemo(() => {
        const term = query.trim().toLowerCase();

        return attempts.filter((a) => {
            if (term && !a.user_name.toLowerCase().includes(term)) return false;
            if (filter === 'pending') return a.status === 'submitted';
            if (filter === 'passed') return a.status === 'graded' && a.is_passed;
            if (filter === 'failed') return a.status === 'graded' && !a.is_passed;

            return true;
        });
    }, [attempts, filter, query]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${exam.title} — үр дүн`} />

            {/* ── Кино маягийн толгой ────────────────────────────────────── */}
            <HeroShell>
                <div className="px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="min-w-0">
                            <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/90">
                                {[exam.course_title, exam.lesson_title].filter(Boolean).join(' · ') || 'Шалгалтын үр дүн'}
                            </p>

                            <h1 className="mt-1.5 text-2xl font-black leading-tight tracking-tight sm:text-[28px]">
                                {exam.title}
                            </h1>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <HeroChip icon={FileQuestion}>{questions.length} асуулт · {exam.max_score} оноо</HeroChip>
                                <HeroChip icon={Target}>Тэнцэх {exam.pass_percent}%</HeroChip>
                                {best > 0 && <HeroChip icon={Trophy}>Хамгийн өндөр {best}%</HeroChip>}
                            </div>

                            {/* Оролдлогуудыг гурав хуваасан нэг зурвас */}
                            {attempts.length > 0 && (
                                <ReachBar
                                    total={attempts.length}
                                    segments={[
                                        { bar: 'bg-emerald-400', label: 'Тэнцсэн', value: passed.length },
                                        { bar: 'bg-rose-400', label: 'Тэнцээгүй', value: failed.length },
                                        { bar: 'bg-amber-400', label: 'Үнэлэх', value: pending.length },
                                    ]}
                                />
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <Link href="/admin/lab-training/exams" className={GLASS}>
                                <ArrowLeft className="size-3.5" />
                                Буцах
                            </Link>
                        </div>
                    </div>

                    <HeroStatGrid className="mt-5 xl:grid-cols-5">
                        <HeroStat
                            tone="violet" icon={Users} label="Өгсөн"
                            value={attempts.length} hint={`${graded.length} үнэлэгдсэн`}
                        />
                        <HeroStat
                            tone="emerald" icon={Trophy} label="Тэнцсэн"
                            value={passed.length} hint={`${share(passed.length, graded.length)}%`}
                            percent={share(passed.length, graded.length)}
                        />
                        <HeroStat
                            tone="rose" icon={XCircle} label="Тэнцээгүй"
                            value={failed.length} hint={`${share(failed.length, graded.length)}%`}
                            percent={share(failed.length, graded.length)}
                        />
                        <HeroStat
                            tone="sky" icon={Target} label="Дундаж оноо"
                            value={`${avg}%`} hint={`тэнцэх ${exam.pass_percent}%`}
                            percent={avg}
                        />
                        <HeroStat
                            tone={pending.length > 0 ? 'amber' : 'slate'} icon={Clock3} label="Үнэлэх"
                            value={pending.length}
                            hint={pending.length > 0 ? 'гараар үнэлнэ' : 'хүлээгдэлгүй'}
                        />
                    </HeroStatGrid>
                </div>
            </HeroShell>

            <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
                <LabItemAnalysis analysis={analysis} />

                <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-4">
                        <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight">
                            <GraduationCap className="size-4 text-muted-foreground" />
                            Өгсөн шалгалтууд
                        </h2>
                        <span className="rounded-full bg-muted px-2 text-[11px] font-semibold leading-5 tabular-nums text-muted-foreground">
                            {attempts.length}
                        </span>

                        {attempts.length > 0 && (
                            <div className="ml-auto flex flex-wrap items-center gap-2">
                                <div className="relative w-full sm:w-48">
                                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Ажилтан хайх"
                                        className={cn(INPUT, 'pl-8')}
                                    />
                                </div>

                                <div className="inline-flex h-8 rounded-lg border bg-muted/40 p-0.5">
                                    {([
                                        ['all', 'Бүгд', attempts.length],
                                        ['passed', 'Тэнцсэн', passed.length],
                                        ['failed', 'Тэнцээгүй', failed.length],
                                        ['pending', 'Үнэлэх', pending.length],
                                    ] as [Filter, string, number][]).map(([key, label, count]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setFilter(key)}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-medium transition',
                                                filter === key
                                                    ? 'bg-card text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground',
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
                    </div>

                    {rows.length === 0 ? (
                        <Empty
                            title={
                                attempts.length === 0
                                    ? 'Хараахан хэн ч шалгалт өгөөгүй байна'
                                    : 'Илэрц олдсонгүй'
                            }
                            text={
                                attempts.length === 0
                                    ? 'Шалгалтыг нийтэлсний дараа ажилтнууд өгч эхэлнэ.'
                                    : 'Хайлт эсвэл шүүлтээ өөрчилж үзнэ үү.'
                            }
                        />
                    ) : (
                        rows.map((a, i) => (
                            <AttemptRow
                                key={a.id}
                                attempt={a}
                                first={i === 0}
                                isOpen={openId === a.id}
                                onToggle={() => setOpenId(openId === a.id ? null : a.id)}
                                byId={byId}
                            />
                        ))
                    )}
                </section>
            </div>
        </AppLayout>
    );
}

/* ── Толгойн жижиг шошго ───────────────────────────────────────────────── */
function HeroChip({ icon: Icon, children }: { icon: typeof Target; children: ReactNode }) {
    return (
        <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 text-[11px] font-semibold text-white/75 backdrop-blur-sm">
            <Icon className="size-3 shrink-0" />
            {children}
        </span>
    );
}

/* ── Нэг оролдлогын мөр ────────────────────────────────────────────────── */
function AttemptRow({ attempt: a, first, isOpen, onToggle, byId }: {
    attempt: Attempt;
    first: boolean;
    isOpen: boolean;
    onToggle: () => void;
    byId: Map<number, Question>;
}) {
    const waiting = a.status === 'submitted';

    return (
        <div className={cn(!first && 'border-t')}>
            <button
                onClick={onToggle}
                className={cn(
                    'relative flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40 sm:px-4',
                    isOpen && 'bg-muted/30',
                )}
            >
                {/* Үнэлэх хүлээж буй оролдлого зүүн ирмэгээрээ тэмдэглэгдэнэ */}
                {waiting && <span className="absolute inset-y-0 left-0 w-[3px] bg-amber-500" />}

                <ChevronDown className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    !isOpen && '-rotate-90',
                )} />

                <AvatarRing name={a.user_name} percent={a.percent} idle={a.percent === 0 && waiting} />

                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold">{a.user_name}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {a.submitted_at ?? 'дуусаагүй'}
                    </p>
                </div>

                {waiting ? (
                    <Tag tone="amber">Үнэлэх</Tag>
                ) : a.is_passed ? (
                    <Tag tone="emerald">Тэнцсэн</Tag>
                ) : (
                    <Tag tone="rose">Тэнцээгүй</Tag>
                )}

                <span className="hidden w-40 shrink-0 items-center gap-2 sm:flex">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                            className={cn(
                                'block h-full rounded-full transition-[width] duration-700 ease-out',
                                waiting ? 'bg-amber-500' : a.is_passed ? 'bg-emerald-500' : 'bg-rose-500',
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, a.percent))}%` }}
                        />
                    </span>
                </span>

                <span className="w-20 shrink-0 text-right">
                    <span className={cn(
                        'text-sm font-black tabular-nums',
                        waiting
                            ? 'text-amber-600 dark:text-amber-400'
                            : a.is_passed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400',
                    )}>
                        {a.percent}%
                    </span>
                    <span className="ml-1 text-[11px] tabular-nums text-muted-foreground">
                        {a.score}/{a.max_score}
                    </span>
                </span>
            </button>

            {isOpen && <AttemptDetail attempt={a} byId={byId} />}
        </div>
    );
}

/* ── Нэг оролдлогын задаргаа + задгай хариултын үнэлгээ ────────────────── */
function AttemptDetail({ attempt, byId }: { attempt: Attempt; byId: Map<number, Question> }) {
    return (
        <div className="space-y-2.5 border-t bg-muted/20 p-3 sm:p-4">
            {attempt.answers.map((ans, i) => {
                const q = byId.get(ans.question_id);

                if (!q) return null;

                return (
                    <div key={ans.id} className="overflow-hidden rounded-xl border bg-card">
                        <div className="flex items-start gap-2.5 border-b bg-muted/25 px-3 py-2">
                            <span className="grid size-5 shrink-0 place-items-center rounded bg-muted text-[10px] font-bold tabular-nums text-muted-foreground">
                                {i + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium leading-snug">{q.body}</p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {q.type_label} ·{' '}
                                    <span className="font-semibold tabular-nums">{ans.points}</span>
                                    <span className="tabular-nums">/{q.points}</span> оноо
                                </p>
                            </div>

                            {ans.is_correct === null ? (
                                <Clock3 className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            ) : ans.is_correct ? (
                                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                                <XCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                            )}
                        </div>

                        <div className="p-3">
                            {q.image_url && (
                                <img src={q.image_url} alt="" className="mb-2.5 h-24 rounded-lg border object-contain" />
                            )}

                            {q.type === 'text' ? (
                                <>
                                    <div className="whitespace-pre-line rounded-lg border bg-muted/40 p-2.5 text-[13px] leading-relaxed">
                                        {ans.text || <span className="text-muted-foreground">— хоосон —</span>}
                                    </div>
                                    <GradeForm answer={ans} maxPoints={q.points} />
                                </>
                            ) : (
                                <ul className="space-y-1">
                                    {q.options.map((o) => {
                                        const chosen = ans.selected.includes(o.id);

                                        return (
                                            <li
                                                key={o.id}
                                                className={cn(
                                                    'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px]',
                                                    o.is_correct
                                                        ? 'border-emerald-300/70 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/10'
                                                        : chosen
                                                            ? 'border-rose-300/70 bg-rose-50/70 dark:border-rose-500/25 dark:bg-rose-500/10'
                                                            : 'border-transparent',
                                                )}
                                            >
                                                <span className="min-w-0 flex-1 truncate">{o.body}</span>
                                                {chosen && (
                                                    <span className="shrink-0 rounded bg-foreground/10 px-1.5 text-[10px] font-semibold leading-[18px]">
                                                        сонгосон
                                                    </span>
                                                )}
                                                {o.is_correct && (
                                                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {q.explanation && (
                                <p className="mt-2.5 rounded-lg border border-dashed px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
                                    {q.explanation}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── Задгай хариултыг гараар үнэлэх жижиг форм ─────────────────────────── */
function GradeForm({ answer, maxPoints }: { answer: Answer; maxPoints: number }) {
    const [points, setPoints]     = useState(String(answer.points));
    const [feedback, setFeedback] = useState(answer.feedback ?? '');
    const [saving, setSaving]     = useState(false);

    // Хадгалсны дараа зөвхөн өөрчилсөн үед л дахин идэвхжинэ — давхар дарахаас сэргийлнэ
    const dirty = points !== String(answer.points) || feedback !== (answer.feedback ?? '');

    function save() {
        setSaving(true);

        router.post(
            `/admin/lab-training/answers/${answer.id}/grade`,
            { points: Number(points), feedback },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border bg-muted/30 p-2.5">
            <div className="w-24">
                <label className={LABEL}>Оноо (0–{maxPoints})</label>
                <input
                    type="number" min={0} max={maxPoints} step="0.5"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    className={FIELD}
                />
            </div>

            <div className="min-w-[180px] flex-1">
                <label className={LABEL}>Тайлбар</label>
                <input
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Ажилтанд харагдана"
                    className={FIELD}
                />
            </div>

            <button
                type="button"
                onClick={save}
                disabled={saving || !dirty}
                className={cn(CTA, 'h-9')}
            >
                {saving ? 'Хадгалж байна…' : 'Үнэлгээ хадгалах'}
            </button>

            {!dirty && !saving && answer.is_correct !== null && (
                <span className={cn(BTN, 'pointer-events-none h-9 border-0 text-muted-foreground')}>
                    Хадгалагдсан
                </span>
            )}
        </div>
    );
}
