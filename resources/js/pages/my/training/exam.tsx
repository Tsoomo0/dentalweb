import {
    MobileBody, MobileCard, MobileHero, MobileShell, MobileStatRow, SURFACE,
} from '@/components/my-mobile-ui';
import { CARD, CARD_HOVER, Chip, SectionHeader } from '@/components/lab-training-ui';
import ProgressRing from '@/components/progress-ring';
import MyLayout from '@/layouts/my-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Award, CheckCircle2, Clock, FileQuestion, History, Info, Play, RotateCcw,
    Shuffle, Target, Trophy, XCircle,
} from 'lucide-react';

interface Attempt {
    id: number;
    submitted_at: string | null;
    score: number;
    max_score: number;
    percent: number;
    is_passed: boolean;
    status: string;
}

interface Props {
    exam: {
        id: number;
        title: string;
        description: string | null;
        course_title: string | null;
        lesson_id: number | null;
        lesson_title: string | null;
        duration_minutes: number | null;
        pass_percent: number;
        questions_count: number;
        max_score: number;
        opens_at: string | null;
        closes_at: string | null;
        state: 'open' | 'upcoming' | 'closed';
        is_open: boolean;
    };
    attempts: Attempt[];
    openAttemptId: number | null;
}

export default function LabExamIntro({ exam, attempts, openAttemptId }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Шалгалт', href: '/my/training/exams' },
        { title: exam.title, href: `/my/training/exams/${exam.id}` },
    ];

    const best     = attempts.reduce<Attempt | null>((b, a) => (!b || a.percent > b.percent ? a : b), null);
    // Нээлттэй байх хугацаанд хэдэн ч удаа өгч болно
    const canStart = exam.is_open;

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title={exam.title} />

            {/* ═══════════════════ MOBILE ═══════════════════ */}
            <MobileExam exam={exam} attempts={attempts} openAttemptId={openAttemptId} best={best} canStart={canStart} />

            {/* ═══════════════════ DESKTOP ═══════════════════ */}
            <div className="hidden w-full space-y-5 p-4 sm:p-6 md:block lg:p-8 2xl:px-10">
                {/* ── Толгой ─────────────────────────────────────────────── */}
                <section className="relative overflow-hidden rounded-3xl bg-neutral-950 text-white shadow-2xl shadow-violet-950/20 ring-1 ring-white/10">
                    <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-violet-600/25 blur-3xl" />
                    {best?.is_passed && (
                        <div className="pointer-events-none absolute -left-16 bottom-0 size-52 rounded-full bg-emerald-500/20 blur-3xl" />
                    )}

                    {/* Нарийн тор + дээд ирмэгийн гэрэл — гүн өгнө */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 opacity-[0.06]"
                        style={{
                            backgroundImage:
                                'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px),' +
                                'linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
                            backgroundSize: '38px 38px',
                            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
                            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
                        }}
                    />
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300">
                                {exam.course_title ?? 'Шалгалт'}
                            </p>
                            <h1 className="mt-1.5 text-xl font-bold leading-snug tracking-tight sm:text-2xl">
                                {exam.title}
                            </h1>

                            {exam.description && (
                                <p className="mt-2 max-w-lg whitespace-pre-line text-sm leading-relaxed text-white/60">
                                    {exam.description}
                                </p>
                            )}

                            {exam.lesson_id && (
                                <Link
                                    href={`/my/training/lessons/${exam.lesson_id}`}
                                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-violet-300 transition hover:text-violet-200"
                                >
                                    <RotateCcw className="size-3.5" />
                                    Холбогдох хичээлийг эргэж үзэх
                                </Link>
                            )}
                        </div>

                        {best && (
                            <div className="flex shrink-0 items-center gap-4 rounded-xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
                                <ProgressRing percent={best.percent} size={60} stroke={5} className="text-white" />
                                <div className="text-xs leading-tight">
                                    <p className="font-semibold text-white">Хамгийн сайн дүн</p>
                                    <p className="mt-1 text-white/60">
                                        {best.score} / {best.max_score} оноо
                                    </p>
                                    {best.is_passed && (
                                        <p className="mt-1.5 inline-flex items-center gap-1 font-semibold text-emerald-400">
                                            <Trophy className="size-3" />
                                            Тэнцсэн
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Үзүүлэлт ───────────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Fact icon={FileQuestion} label="Асуулт" value={String(exam.questions_count)} />
                    <Fact icon={Award} label="Нийт оноо" value={String(exam.max_score)} />
                    <Fact
                        icon={Clock}
                        label="Хугацаа"
                        value={exam.duration_minutes ? `${exam.duration_minutes} мин` : 'Хязгааргүй'}
                    />
                    <Fact icon={Target} label="Тэнцэх босго" value={`${exam.pass_percent}%`} />
                </div>

                {/* ── Дүрэм ──────────────────────────────────────────────── */}
                <section className={cn(CARD, 'p-4 sm:p-5')}>
                    <SectionHeader icon={Info} title="Шалгалтын дүрэм" className="mb-4" />

                    <ul className="space-y-2.5 text-sm">
                        {exam.duration_minutes && (
                            <Rule icon={Clock}>
                                Эхэлмэгц цаг тоологдоно. Хугацаа дуусахад <b className="font-semibold">автоматаар илгээгдэнэ</b>.
                            </Rule>
                        )}
                        <Rule icon={CheckCircle2}>Хариулт бүр шууд хадгалагдана — таб хаагдсан ч алдагдахгүй.</Rule>
                        <Rule icon={Shuffle}>
                            Шалгалт нээлттэй байх хугацаанд дахин өгч болно — хамгийн сайн дүн тооцогдоно.
                        </Rule>
                        {exam.opens_at && exam.state === 'upcoming' && (
                            <Rule icon={Clock}>
                                Шалгалт нээгдэх хугацаа: <b className="font-semibold">{exam.opens_at}</b>
                            </Rule>
                        )}
                        {exam.closes_at && (
                            <Rule icon={Clock}>
                                Шалгалт хаагдах хугацаа: <b className="font-semibold">{exam.closes_at}</b>
                            </Rule>
                        )}
                    </ul>
                </section>

                {/* ── Эхлүүлэх ───────────────────────────────────────────── */}
                <section className={cn(CARD, 'p-4 sm:p-5')}>
                    {openAttemptId ? (
                        <>
                            <p className="mb-3 text-sm text-muted-foreground">
                                Дуусаагүй шалгалт байна. Үргэлжлүүлэх үү?
                            </p>
                            <Link
                                href={`/my/training/exams/${exam.id}/attempt/${openAttemptId}`}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-white shadow-sm shadow-amber-500/25 transition hover:bg-amber-600 active:scale-[0.99]"
                            >
                                <RotateCcw className="size-4" />
                                Үргэлжлүүлэх
                            </Link>
                        </>
                    ) : canStart ? (
                        <>
                            <p className="mb-3 text-center text-xs text-muted-foreground">
                                {attempts.length > 0 ? 'Шалгалтыг дахин өгөх боломжтой' : 'Шалгалт нээлттэй байна'}
                            </p>
                            <button
                                type="button"
                                onClick={() => router.post(`/my/training/exams/${exam.id}/start`)}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-violet-600/25 ring-1 ring-inset ring-white/15 transition hover:shadow-violet-600/40 hover:brightness-110 active:scale-[0.99]"
                            >
                                <Play className="size-4 fill-current" />
                                Шалгалт эхлүүлэх
                            </button>
                        </>
                    ) : (
                        <p className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                            <XCircle className="size-4 shrink-0" />
                            {exam.state === 'upcoming'
                                  ? `Шалгалт ${exam.opens_at ?? ''} -д нээгдэнэ.`
                                  : exam.state === 'closed'
                                    ? `Шалгалт ${exam.closes_at ?? ''} -д хаагдсан.`
                                    : 'Энэ шалгалт одоогоор нээлттэй биш байна.'}
                        </p>
                    )}
                </section>

                {/* ── Өмнөх оролдлогууд ──────────────────────────────────── */}
                {attempts.length > 0 && (
                    <section className={cn(CARD, 'overflow-hidden')}>
                        <div className="border-b bg-muted/30 px-4 py-3.5 sm:px-5">
                            <SectionHeader icon={History} title="Миний өмнөх дүн" count={attempts.length} />
                        </div>

                        <ul className="divide-y">
                            {attempts.map((attempt) => (
                                <li key={attempt.id}>
                                    <Link
                                        href={`/my/training/exams/${exam.id}/result/${attempt.id}`}
                                        className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-muted/50 sm:px-5"
                                    >
                                        <ProgressRing percent={attempt.percent} size={40} stroke={4} />

                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold tabular-nums">
                                                {attempt.score}/{attempt.max_score} оноо
                                                <span className="ml-2 font-normal text-muted-foreground">
                                                    {attempt.percent}%
                                                </span>
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {attempt.submitted_at ?? 'Дуусаагүй'}
                                            </p>
                                        </div>

                                        {attempt.status === 'submitted' ? (
                                            <Chip tone="amber">Үнэлж байна</Chip>
                                        ) : attempt.is_passed ? (
                                            <Chip tone="emerald" icon={CheckCircle2}>
                                                Тэнцсэн
                                            </Chip>
                                        ) : (
                                            <Chip tone="rose">Тэнцээгүй</Chip>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </MyLayout>
    );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
    return (
        <div className={cn(
            CARD, CARD_HOVER,
            'relative overflow-hidden rounded-2xl border-border/70 bg-gradient-to-b from-card to-muted/25 p-4',
        )}>
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="grid size-6 place-items-center rounded-lg bg-violet-500/10 text-violet-600 ring-1 ring-inset ring-violet-500/15 dark:text-violet-300">
                    <Icon className="size-3.5 shrink-0" />
                </span>
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</span>
            </div>
            <p className="mt-2 text-lg font-bold leading-none tabular-nums">{value}</p>
        </div>
    );
}

function Rule({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2.5 leading-relaxed text-muted-foreground">
            <Icon className="mt-0.5 size-4 shrink-0 text-violet-500" />
            <span>{children}</span>
        </li>
    );
}

/* ══════════════════════ MOBILE ══════════════════════ */
/**
 * Утсан дээр энэ хуудсанд ганц л асуулт байна: "одоо эхлэх үү, үгүй юу".
 * Тиймээс эхлүүлэх товчийг hero-гийн ЯГ ДООР, хамгийн эхэнд тавьж, дүрэм ба
 * өмнөх дүнг доор нь байрлуулав — уншмаар хүн доош гүйлгэнэ.
 */
function MobileExam({ exam, attempts, openAttemptId, best, canStart }: {
    exam: Props['exam'];
    attempts: Attempt[];
    openAttemptId: number | null;
    best: Attempt | null;
    canStart: boolean;
}) {
    return (
        <MobileShell>
            <MobileHero
                eyebrow="ШАЛГАЛТ"
                back="/my/training/exams"
                title={exam.title}
                subtitle={exam.course_title}
                showAvatar={false}
            >
                <MobileStatRow
                    items={[
                        { val: exam.questions_count, label: 'асуулт', dot: 'rgba(255,255,255,0.45)' },
                        { val: exam.duration_minutes ? `${exam.duration_minutes}` : '∞', label: exam.duration_minutes ? 'минут' : 'хязгааргүй', dot: '#93c5fd' },
                        { val: `${exam.pass_percent}%`, label: 'тэнцэх босго', dot: '#fbbf24' },
                    ]}
                />

                {best && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: best.is_passed ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {best.is_passed ? <Trophy size={16} color="#4ade80" /> : <Award size={16} color="rgba(255,255,255,0.7)" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12.5, fontWeight: 800, color: 'white', margin: 0 }}>
                                Хамгийн сайн дүн · {best.percent}%
                            </p>
                            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0', fontWeight: 600 }}>
                                {best.score} / {best.max_score} оноо{best.is_passed ? ' · Тэнцсэн' : ''}
                            </p>
                        </div>
                    </div>
                )}
            </MobileHero>

            <MobileBody>
                {/* Эхлүүлэх — хамгийн эхэнд, хамгийн том */}
                <div style={{ marginBottom: 12 }}>
                    {openAttemptId ? (
                        <Link href={`/my/training/exams/${exam.id}/attempt/${openAttemptId}`} style={{ textDecoration: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius: 18, padding: '16px 0', boxShadow: '0 6px 20px rgba(217,119,6,0.35)' }}>
                                <RotateCcw size={17} color="white" />
                                <span style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Дуусаагүй шалгалтаа үргэлжлүүлэх</span>
                            </div>
                        </Link>
                    ) : canStart ? (
                        <button
                            type="button"
                            onClick={() => router.post(`/my/training/exams/${exam.id}/start`)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#8b5cf6,#d946ef)', borderRadius: 18, padding: '16px 0', border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(139,92,246,0.35)' }}
                        >
                            <Play size={17} color="white" fill="white" />
                            <span style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>
                                {attempts.length > 0 ? 'Дахин өгөх' : 'Шалгалт эхлүүлэх'}
                            </span>
                        </button>
                    ) : (
                        <MobileCard style={{ padding: '16px 14px' }}>
                            <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5, color: SURFACE.muted, margin: 0, fontWeight: 600, textAlign: 'center' }}>
                                <XCircle size={14} />
                                {exam.state === 'upcoming'
                                    ? `Шалгалт ${exam.opens_at ?? ''}-д нээгдэнэ`
                                    : exam.state === 'closed'
                                        ? `Шалгалт ${exam.closes_at ?? ''}-д хаагдсан`
                                        : 'Энэ шалгалт одоогоор нээлттэй биш'}
                            </p>
                        </MobileCard>
                    )}
                </div>

                {exam.description && (
                    <MobileCard style={{ padding: '14px', marginBottom: 12 }}>
                        <p style={{ fontSize: 12.5, color: SURFACE.muted, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                            {exam.description}
                        </p>
                    </MobileCard>
                )}

                {exam.lesson_id && (
                    <Link href={`/my/training/lessons/${exam.lesson_id}`} style={{ textDecoration: 'none' }}>
                        <MobileCard style={{ padding: '13px 14px', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 13, background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <RotateCcw size={16} color="#7c3aed" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13.5, fontWeight: 700, color: SURFACE.strong, margin: 0 }}>Холбогдох хичээл</p>
                                    <p style={{ fontSize: 11, color: SURFACE.faint, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {exam.lesson_title ?? 'Эргэж үзэх'}
                                    </p>
                                </div>
                            </div>
                        </MobileCard>
                    </Link>
                )}

                {/* Дүрэм */}
                <p style={{ fontSize: 11, fontWeight: 800, color: SURFACE.faint, letterSpacing: 0.5, margin: '4px 0 8px', paddingLeft: 2 }}>
                    ШАЛГАЛТЫН ДҮРЭМ
                </p>
                <MobileCard style={{ padding: '4px 0', marginBottom: 12 }}>
                    {[
                        exam.duration_minutes ? 'Эхэлмэгц цаг тоологдоно. Хугацаа дуусахад автоматаар илгээгдэнэ.' : null,
                        'Хариулт бүр шууд хадгалагдана — таб хаагдсан ч алдагдахгүй.',
                        'Нээлттэй хугацаанд дахин өгч болно — хамгийн сайн дүн тооцогдоно.',
                        exam.opens_at && exam.state === 'upcoming' ? `Нээгдэх хугацаа: ${exam.opens_at}` : null,
                        exam.closes_at ? `Хаагдах хугацаа: ${exam.closes_at}` : null,
                    ].filter(Boolean).map((rule, i, arr) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${SURFACE.divider}` }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#7c3aed', flexShrink: 0, marginTop: 6 }} />
                            <p style={{ fontSize: 12.5, color: SURFACE.muted, margin: 0, lineHeight: 1.5 }}>{rule}</p>
                        </div>
                    ))}
                </MobileCard>

                {/* Өмнөх дүн */}
                {attempts.length > 0 && (
                    <>
                        <p style={{ fontSize: 11, fontWeight: 800, color: SURFACE.faint, letterSpacing: 0.5, margin: '4px 0 8px', paddingLeft: 2 }}>
                            МИНИЙ ӨМНӨХ ДҮН · {attempts.length}
                        </p>
                        <MobileCard>
                            {attempts.map((attempt, i) => (
                                <Link key={attempt.id} href={`/my/training/exams/${exam.id}/result/${attempt.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderBottom: i === attempts.length - 1 ? 'none' : `1px solid ${SURFACE.divider}` }}>
                                        <div style={{
                                            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: attempt.is_passed ? '#ecfdf5' : attempt.status === 'submitted' ? '#fffbeb' : '#fef2f2',
                                        }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 900, color: attempt.is_passed ? '#059669' : attempt.status === 'submitted' ? '#d97706' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                                                {attempt.percent}%
                                            </span>
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: 13.5, fontWeight: 700, color: SURFACE.strong, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                                                {attempt.score}/{attempt.max_score} оноо
                                            </p>
                                            <p style={{ fontSize: 11, color: SURFACE.faint, margin: '2px 0 0' }}>
                                                {attempt.submitted_at ?? 'Дуусаагүй'}
                                            </p>
                                        </div>

                                        <span style={{
                                            flexShrink: 0, borderRadius: 99, padding: '4px 10px', fontSize: 10.5, fontWeight: 800,
                                            background: attempt.is_passed ? '#d1fae5' : attempt.status === 'submitted' ? '#fef3c7' : '#fee2e2',
                                            color: attempt.is_passed ? '#047857' : attempt.status === 'submitted' ? '#b45309' : '#b91c1c',
                                        }}>
                                            {attempt.status === 'submitted' ? 'Үнэлж байна' : attempt.is_passed ? 'Тэнцсэн' : 'Тэнцээгүй'}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </MobileCard>
                    </>
                )}
            </MobileBody>
        </MobileShell>
    );
}
