import { Empty, Tag } from '@/components/lab-admin-ui';
import { TONE, type Tone } from '@/components/lab-training-ui';
import { cn } from '@/lib/utils';
import { CheckCircle2, ChevronDown, FlaskConical, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * Асуултын чанарын шинжилгээ (item analysis).
 *
 * Шалгалтын үр дүн нь ажилтныг үнэлдэг. Энэ хэсэг эсрэгээр — АСУУЛТЫГ үнэлнэ.
 *
 * ДҮРСЛЭЛИЙН БОДОЛ: админ энд ганцхан зүйл хайж байна — "аль асуултыг засах
 * вэ". Тиймээс анхаарал татах асуултууд дээрээ ирж, зүүн ирмэгээрээ өнгөт
 * зураастай гарна. Эрүүл асуултууд доор чимээгүй хэвтэнэ — тэднийг уншихгүй
 * өнгөрч болно.
 */

export interface ItemOption {
    id: number;
    body: string;
    is_correct: boolean;
    picked: number;
    percent: number;
    is_dead: boolean;
}

export interface Item {
    id: number;
    body: string;
    type: string;
    type_label: string;
    points: number;
    answered: number;
    correct: number;
    wrong: number;
    pending: number;
    correct_percent: number | null;
    avg_points: number;
    level: 'easy' | 'good' | 'hard' | null;
    discrimination: number | null;
    flag: 'ok' | 'too_easy' | 'too_hard' | 'reversed' | 'weak';
    options: ItemOption[];
    is_open: boolean;
}

export interface Analysis {
    sample: number;
    reliable: boolean;
    questions: Item[];
}

const FLAG_LABEL: Record<Item['flag'], { text: string; tone: Tone } | null> = {
    ok:       null,
    too_easy: { text: 'Хэт хялбар', tone: 'amber' },
    too_hard: { text: 'Хэт хүнд', tone: 'rose' },
    reversed: { text: 'Эсрэг ажиллаж байна', tone: 'rose' },
    weak:     { text: 'Ялгах чадвар сул', tone: 'amber' },
};

const LEVEL_TONE: Record<'easy' | 'good' | 'hard', Tone> = {
    easy: 'emerald',
    good: 'sky',
    hard: 'amber',
};

/** Анхаарах шаардлагатай асуулт эхэнд гарна. */
const FLAG_ORDER: Record<Item['flag'], number> = {
    reversed: 0, too_hard: 1, weak: 2, too_easy: 3, ok: 4,
};

export default function LabItemAnalysis({ analysis }: { analysis: Analysis }) {
    const [openId, setOpenId] = useState<number | null>(null);

    // Асуултын анхны дугаарыг хадгална — эрэмбэ өөрчлөгдсөн ч админ шалгалтаа
    // засахдаа хэддүгээр асуултыг хайхаа мэдэж байх ёстой
    const numberOf = useMemo(
        () => new Map(analysis.questions.map((q, i) => [q.id, i + 1])),
        [analysis.questions],
    );

    const rows = useMemo(
        () => [...analysis.questions].sort(
            (a, b) => FLAG_ORDER[a.flag] - FLAG_ORDER[b.flag]
                || (a.correct_percent ?? 101) - (b.correct_percent ?? 101),
        ),
        [analysis.questions],
    );

    const flagged = rows.filter((q) => q.flag !== 'ok').length;

    return (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-4">
                <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight">
                    <FlaskConical className="size-4 text-muted-foreground" />
                    Асуултын чанар
                </h2>

                {analysis.sample === 0 ? null : flagged > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                        <TriangleAlert className="size-3" />
                        {flagged} асуулт анхаарал шаардаж байна
                    </span>
                ) : (
                    <span className="text-[11px] text-muted-foreground">
                        Бүх асуулт хэвийн ажиллаж байна
                    </span>
                )}

                {analysis.sample > 0 && (
                    <span className="ml-auto text-[11px] text-muted-foreground">
                        {analysis.sample} оролдлогоор
                        {!analysis.reliable && ' · ялгах чадвар бодоход өгөгдөл цөөн'}
                    </span>
                )}
            </div>

            {analysis.sample === 0 ? (
                <Empty
                    title="Шинжлэх өгөгдөл алга"
                    text="Ажилтнууд шалгалт өгч эхэлмэгц асуулт бүрийн хүндрэл, ялгах чадвар энд бодогдоно."
                />
            ) : (
                rows.map((q, i) => (
                    <ItemRow
                        key={q.id}
                        item={q}
                        index={numberOf.get(q.id) ?? i + 1}
                        first={i === 0}
                        isOpen={openId === q.id}
                        onToggle={() => setOpenId(openId === q.id ? null : q.id)}
                    />
                ))
            )}
        </section>
    );
}

function ItemRow({ item: q, index, first, isOpen, onToggle }: {
    item: Item;
    index: number;
    first: boolean;
    isOpen: boolean;
    onToggle: () => void;
}) {
    const flag    = FLAG_LABEL[q.flag];
    const percent = q.correct_percent;
    const tone    = q.level ? LEVEL_TONE[q.level] : 'slate';

    return (
        <div className={cn(!first && 'border-t')}>
            <button
                onClick={onToggle}
                className={cn(
                    'relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 sm:px-4',
                    isOpen && 'bg-muted/30',
                )}
            >
                {/* Анхаарах асуулт зүүн ирмэгээрээ тэмдэглэгдэнэ */}
                {flag && (
                    <span className={cn(
                        'absolute inset-y-0 left-0 w-[3px]',
                        flag.tone === 'rose' ? 'bg-rose-500' : 'bg-amber-500',
                    )} />
                )}

                <span className="w-5 shrink-0 text-right text-[11px] font-semibold tabular-nums text-muted-foreground/60">
                    {index}
                </span>

                <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[13px] font-medium">{q.body}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{q.type_label}</span>
                        <span className="opacity-40">·</span>
                        <span className="tabular-nums">{q.answered} хариулт</span>
                        {q.pending > 0 && (
                            <>
                                <span className="opacity-40">·</span>
                                <span className="text-amber-600 dark:text-amber-400">
                                    {q.pending} үнэлэгдээгүй
                                </span>
                            </>
                        )}
                        {flag && <Tag tone={flag.tone}>{flag.text}</Tag>}
                    </span>
                </span>

                {/* Зөв хариулсан хувь — өнгө нь хүндрэлийн түвшинг хэлнэ */}
                <span className="hidden w-28 shrink-0 sm:block">
                    {percent === null ? (
                        <span className="block text-right text-[11px] text-muted-foreground/50">
                            үнэлэгдээгүй
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <span
                                    className={cn('block h-full rounded-full', TONE[tone].bar)}
                                    style={{ width: `${percent}%` }}
                                />
                            </span>
                            <span className={cn(
                                'w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums',
                                TONE[tone].text,
                            )}>
                                {percent}%
                            </span>
                        </span>
                    )}
                </span>

                {/* Ялгах чадвар — 0.2-оос дээш сайн, сөрөг бол эвдэрсэн асуулт */}
                <span className="hidden w-16 shrink-0 text-right lg:block">
                    {q.discrimination === null ? (
                        <span className="text-[11px] text-muted-foreground/40">—</span>
                    ) : (
                        <span
                            title="Ялгах чадвар: шалгалтыг сайн өгсөн хүмүүс энэ асуултыг хэр зөв хариулсан бэ"
                            className={cn(
                                'text-xs font-semibold tabular-nums',
                                q.discrimination < 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : q.discrimination < 0.2
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-emerald-600 dark:text-emerald-400',
                            )}
                        >
                            D {q.discrimination.toFixed(2)}
                        </span>
                    )}
                </span>

                <ChevronDown className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    !isOpen && '-rotate-90',
                )} />
            </button>

            {isOpen && (
                <div className="border-t bg-muted/20 px-3 py-3 sm:px-4">
                    {q.is_open ? (
                        <p className="text-xs text-muted-foreground">
                            Задгай хариулттай асуултыг сонголтоор задлах боломжгүй. Дундаж оноо:{' '}
                            <b className="tabular-nums text-foreground">{q.avg_points}</b> / {q.points}
                        </p>
                    ) : q.options.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Сонголт бүртгэгдээгүй байна.</p>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
                                Сонголт бүрийг хэдэн хүн сонгосон
                            </p>

                            {q.options.map((o) => (
                                <div key={o.id} className="flex items-center gap-2.5">
                                    <span className={cn(
                                        'grid size-4 shrink-0 place-items-center rounded-full',
                                        o.is_correct
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                            : 'bg-muted text-muted-foreground/50',
                                    )}>
                                        {o.is_correct && <CheckCircle2 className="size-3" />}
                                    </span>

                                    <span className={cn(
                                        'min-w-0 flex-1 truncate text-xs',
                                        o.is_correct && 'font-medium',
                                    )}>
                                        {o.body}
                                        {o.is_dead && (
                                            <span className="ml-1.5 text-[10px] text-muted-foreground/60">
                                                (хэн ч сонгоогүй — солих нэр дэвшигч)
                                            </span>
                                        )}
                                    </span>

                                    <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-muted">
                                        <span
                                            className={cn(
                                                'block h-full rounded-full',
                                                o.is_correct ? 'bg-emerald-500' : 'bg-rose-400/70',
                                            )}
                                            style={{ width: `${o.percent}%` }}
                                        />
                                    </span>

                                    <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                                        {o.picked} · {o.percent}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
