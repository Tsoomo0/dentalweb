import { TONE, type Tone } from '@/components/lab-training-ui';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { Eye, EyeOff, GraduationCap, Heart, Pin, Trash2, X, type LucideIcon } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

/**
 * Админ талын лабораторийн сургалтын хуудсуудын нийтлэг дүрслэл.
 *
 * ХЭМЖЭЭНИЙ НЭГДСЭН ЖОР: товч бүр 28 эсвэл 32px өндөр, талбар бүр 32/36px,
 * дүрс бүр 14px, хүснэгтийн мөр 48/56px. Хуудсан дээрх юм бүхэн эдгээрийн аль
 * нэгийг л авна — тиймээс юу ч бусдаасаа том, эсвэл ганцаараа өөр харагдахгүй.
 */

export const BTN   = 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition hover:bg-muted active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40';
export const CTA   = 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white transition hover:bg-violet-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40';
export const INPUT = 'h-8 w-full rounded-lg border bg-background px-3 text-xs outline-none transition placeholder:text-muted-foreground/60 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15';
export const FIELD = 'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15';
export const AREA  = 'w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15';
export const LABEL = 'mb-1.5 block text-[11px] font-semibold text-muted-foreground';

export const FILE_INPUT =
    'block w-full text-[11px] text-muted-foreground file:mr-2.5 file:h-8 file:cursor-pointer file:rounded-lg '
    + 'file:border file:border-solid file:bg-background file:px-3 file:text-[11px] file:font-medium file:text-foreground hover:file:bg-muted';

/* ── Хуудасны толгойн зурвас ───────────────────────────────────────────── */
export function PageHead({ icon: Icon, eyebrow, title, actions }: {
    icon: LucideIcon;
    eyebrow?: ReactNode;
    title: string;
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                    <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                    <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>
                    {eyebrow && (
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                            {eyebrow}
                        </p>
                    )}
                </div>
            </div>

            {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
        </div>
    );
}

/* ── Үзүүлэлтийн нүд ───────────────────────────────────────────────────── */
/**
 * Дээд ирмэг дээрх өнгөт зурвас нь харьцаа өгсөн үед явцын шугам болж
 * ажиллана, эс бөгөөс бүтнээрээ дүүрч зөвхөн тухайн нүдний өнгийг тэмдэглэнэ.
 * Ингэснээр бүх нүд ижил өндөртэй хэвээр үлдэнэ.
 */
export function Stat({ tone, icon: Icon, label, value, hint, percent }: {
    tone: Tone;
    icon: LucideIcon;
    label: string;
    value: string | number;
    hint?: string;
    percent?: number;
}) {
    const fill = percent === undefined ? 100 : Math.min(100, Math.max(0, percent));

    return (
        <div className="relative bg-card px-3.5 pb-2.5 pt-3">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-muted">
                <span
                    className={cn('block h-full transition-[width] duration-700 ease-out', TONE[tone].bar)}
                    style={{ width: `${fill}%` }}
                />
            </span>

            <div className="flex items-center gap-1.5">
                <span className={cn('grid size-5 shrink-0 place-items-center rounded', TONE[tone].tile)}>
                    <Icon className="size-3" />
                </span>
                <span className="truncate text-[11px] text-muted-foreground">{label}</span>
            </div>

            <p className="mt-1.5 flex items-baseline gap-1.5">
                <span className={cn('text-[18px] font-semibold leading-none tabular-nums', TONE[tone].text)}>
                    {value}
                </span>
                {hint && <span className="truncate text-[10px] text-muted-foreground">{hint}</span>}
            </p>
        </div>
    );
}

/** Үзүүлэлтийн нүднүүдийг барих хайрцаг — хоорондоо үсэн зайтай тор. */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn(
            'grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3',
            className,
        )}>
            {children}
        </div>
    );
}

/* ── Явц ───────────────────────────────────────────────────────────────── */
/**
 * Явцын түвшнийг өнгөөр ялгана — эхлээгүй саарал, бага шар, дунд цэнхэр,
 * сайн ногоон. Хүснэгтийг гүйлгэхэд аль мөр хоцорч байгаа нь тоо
 * уншихгүйгээр шууд харагдана.
 */
export function progressTone(percent: number): Tone {
    if (percent >= 75) return 'emerald';
    if (percent >= 40) return 'sky';
    if (percent > 0) return 'amber';

    return 'slate';
}

/** Явцын багана — шугам + хувь нэг мөрөнд, өндөр нь тогтмол. */
export function Bar({ percent, className }: { percent: number; className?: string }) {
    const value = Math.min(100, Math.max(0, percent));
    const tone  = progressTone(value);

    return (
        <span className={cn('flex items-center gap-2', className)}>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                    className={cn('block h-full rounded-full transition-[width] duration-700 ease-out', TONE[tone].bar)}
                    style={{ width: `${value}%` }}
                />
            </span>
            <span className={cn(
                'w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums',
                value > 0 ? TONE[tone].text : 'text-muted-foreground/60',
            )}>
                {Math.round(value)}%
            </span>
        </span>
    );
}

/* ── Жижиг элементүүд ──────────────────────────────────────────────────── */

/** Хамгийн жижиг төлөвийн шошго — мөрийг өндөрсгөхгүй. */
export function Tag({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
    return (
        <span className={cn(
            'inline-flex shrink-0 items-center rounded px-1.5 text-[10px] font-semibold leading-[18px]',
            TONE[tone].chip,
        )}>
            {children}
        </span>
    );
}

export function IconBtn({ icon: Icon, label, onClick, href, danger, active, disabled }: {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    href?: string;
    danger?: boolean;
    active?: boolean;
    disabled?: boolean;
}) {
    const cls = cn(
        'grid size-7 shrink-0 place-items-center rounded-md transition active:scale-95',
        'disabled:pointer-events-none disabled:opacity-25',
        danger
            ? 'text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400'
            : active
                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

    if (href) {
        return (
            <Link href={href} className={cls} title={label}>
                <Icon className="size-3.5" />
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} disabled={disabled} className={cls} title={label}>
            <Icon className="size-3.5" />
        </button>
    );
}

/** Хүснэгт, жагсаалтын хоосон төлөв. */
export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-1.5 px-6 py-14 text-center">
            <p className="text-sm font-semibold">{title}</p>
            {text && <p className="max-w-xs text-xs text-muted-foreground">{text}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

/** Тайлбартай checkbox — формуудад ижил хэлбэрээр харагдана. */
export function Check({ checked, onChange, label, hint }: {
    checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string;
}) {
    return (
        <label className="flex cursor-pointer gap-2.5 rounded-lg border bg-muted/30 p-2.5">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 size-3.5 shrink-0 rounded accent-violet-600"
            />
            <span className="min-w-0">
                <span className="block text-xs font-medium">{label}</span>
                {hint && <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>}
            </span>
        </label>
    );
}

/** Хэсгийн гарчиг — хүснэгтийн дээр тавина. */
export function SectionTitle({ icon: Icon, children, count, action }: {
    icon: LucideIcon; children: ReactNode; count?: number; action?: ReactNode;
}) {
    return (
        <div className="flex items-center gap-2">
            <Icon className="size-3.5 text-muted-foreground" />
            <h2 className="text-xs font-semibold">{children}</h2>
            {count !== undefined && (
                <span className="rounded bg-muted px-1.5 text-[10px] font-semibold leading-[18px] tabular-nums text-muted-foreground">
                    {count}
                </span>
            )}
            {action && <div className="ml-auto">{action}</div>}
        </div>
    );
}

/* ── Кино маягийн толгой ───────────────────────────────────────────────── */
/**
 * Лабын сургалтын хуудсуудын хар толгойн дэвсгэр.
 *
 * Постер зураг өгвөл түүнийг бүдгэрүүлж дэвсгэр болгоно — хуудас бүр өөрийн
 * агуулгын өнгийг өмсөнө. Зураггүй үед гурван гэрлийн толбо ажиллана.
 * Дээр нь нарийн цэгэн бүтэц тавьж хальсны мэдрэмж өгдөг.
 */
export function HeroShell({ backdrop, children }: {
    backdrop?: string | null;
    children: ReactNode;
}) {
    return (
        <header className={cn(
            'relative isolate overflow-hidden bg-neutral-950 text-white',
            // Хуудасны ирмэгээс салгаж, доорх агуулгын хажуугийн зайтай эгнүүлнэ
            'mx-4 mt-4 rounded-2xl ring-1 ring-white/10 sm:mx-6',
        )}>
            {backdrop && (
                <>
                    <img
                        src={backdrop}
                        alt=""
                        aria-hidden
                        className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-30 blur-2xl"
                    />
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/85 to-neutral-950/60" />
                </>
            )}

            <span className="pointer-events-none absolute -left-28 -top-40 size-[26rem] rounded-full bg-violet-600/30 blur-[100px]" />
            <span className="pointer-events-none absolute -right-24 -top-32 size-[22rem] rounded-full bg-sky-500/25 blur-[90px]" />
            <span className="pointer-events-none absolute -bottom-32 left-1/3 size-[20rem] rounded-full bg-fuchsia-600/15 blur-[90px]" />

            <span
                className="pointer-events-none absolute inset-0 text-white opacity-[0.15]"
                style={{
                    backgroundImage: 'radial-gradient(currentColor 0.5px, transparent 0.5px)',
                    backgroundSize: '18px 18px',
                }}
            />

            <div className="relative">{children}</div>
        </header>
    );
}

/** Хар толгой дээрх шилэн товч. */
export const GLASS =
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 '
    + 'text-xs font-semibold text-white backdrop-blur-md transition hover:border-white/25 hover:bg-white/20 active:scale-[0.98]';

/** Хар толгой дээрх гол үйлдэл — цагаан тул хамгийн түрүүнд анзаарагдана. */
export const GLASS_CTA =
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 text-xs font-bold text-neutral-950 '
    + 'shadow-lg shadow-black/30 transition hover:bg-white/90 active:scale-[0.98]';

/** Толгойн нүдний дээд зурвасын градиент — Tone бүрд нэг. */
const HERO_ACCENT: Record<Tone, string> = {
    violet: 'from-violet-400 to-violet-600',
    indigo: 'from-indigo-400 to-indigo-600',
    sky: 'from-sky-400 to-sky-600',
    emerald: 'from-emerald-400 to-emerald-600',
    amber: 'from-amber-400 to-amber-600',
    rose: 'from-rose-400 to-rose-600',
    orange: 'from-orange-400 to-orange-600',
    slate: 'from-white/40 to-white/20',
};

/** Толгойн үзүүлэлтийн нүднүүдийг барих хайрцаг. */
export function HeroStatGrid({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn(
            'grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3',
            className,
        )}>
            {children}
        </div>
    );
}

/**
 * Хар дэвсгэр дээрх үзүүлэлтийн нүд.
 *
 * Дээд ирмэгийн градиент зурвас нь харьцаа өгсөн үед явцын шугам болж
 * ажиллана, эс бөгөөс бүтнээрээ дүүрч зөвхөн өнгө тэмдэглэнэ — ингэснээр
 * бүх нүд ижил өндөртэй хэвээр үлдэнэ.
 */
export function HeroStat({ tone, icon: Icon, label, value, hint, percent }: {
    tone: Tone;
    icon: LucideIcon;
    label: string;
    value: string | number;
    hint?: string;
    percent?: number;
}) {
    const fill = percent === undefined ? 100 : Math.min(100, Math.max(0, percent));

    return (
        <div className="relative bg-neutral-950/60 px-3.5 pb-3 pt-3.5 backdrop-blur-sm">
            <span className="absolute inset-x-0 top-0 h-[2px] bg-white/10">
                <span
                    className={cn('block h-full bg-gradient-to-r transition-[width] duration-700 ease-out', HERO_ACCENT[tone])}
                    style={{ width: `${fill}%` }}
                />
            </span>

            <div className="flex items-center gap-1.5">
                <Icon className="size-3 shrink-0 text-white/45" />
                <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-white/45">
                    {label}
                </span>
            </div>

            <p className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-xl font-black leading-none tabular-nums text-white">{value}</span>
                {hint && <span className="truncate text-[10px] text-white/40">{hint}</span>}
            </p>
        </div>
    );
}

/* ── Явцын цагираг ─────────────────────────────────────────────────────── */

/** conic-gradient нь Tailwind анги авдаггүй тул бодит өнгө хэрэгтэй. */
const RING: Record<Tone, string> = {
    violet: 'rgb(139 92 246)',
    indigo: 'rgb(99 102 241)',
    sky: 'rgb(14 165 233)',
    emerald: 'rgb(16 185 129)',
    amber: 'rgb(245 158 11)',
    rose: 'rgb(244 63 94)',
    orange: 'rgb(249 115 22)',
    slate: 'rgb(148 163 184)',
};

/**
 * Нэрний өмнөх дугуй нь өөрөө явцын цагираг.
 *
 * Мөр бүрийн тоог уншихгүйгээр хэн хаана явааг харна. Огт эхлээгүй хүн
 * цагираггүй, тасархай хүрээтэй саарал үлдэнэ — жагсаалтаас шууд ялгарна.
 */
export function AvatarRing({ name, percent, idle }: {
    name: string;
    percent: number;
    idle?: boolean;
}) {
    const value = Math.min(100, Math.max(0, percent));
    const tone  = progressTone(value);

    return (
        <span
            className="grid size-9 shrink-0 place-items-center rounded-full"
            style={{
                background: idle
                    ? undefined
                    : `conic-gradient(${RING[tone]} ${value * 3.6}deg, rgb(148 163 184 / 0.22) 0)`,
            }}
        >
            <span className={cn(
                'grid size-[30px] place-items-center rounded-full text-[11px] font-bold',
                idle
                    ? 'bg-muted text-muted-foreground/70 ring-1 ring-dashed ring-muted-foreground/30'
                    : cn('bg-card', TONE[tone].text),
            )}>
                {name.slice(0, 1).toUpperCase()}
            </span>
        </span>
    );
}

/* ── Хамрах хүрээний зурвас ────────────────────────────────────────────── */

/** Зурвасын нэг хэсэг. `track` хэсэг зөвхөн тайлбарт гарна, шугамд зурагдахгүй. */
export interface ReachSegment {
    bar: string;
    label: string;
    value: number;
    track?: boolean;
}

/**
 * Хамрах хүрээг нэг шугам дээр хуваасан дүрслэл — хар толгойд зориулав.
 *
 * Тоо уншихаас өмнө хэр их зай дүүрснээр байдал ойлгогдоно. Үлдсэн хэсэг
 * (`track: true`) нь зурагдахгүй, зөвхөн тайлбартаа тоогоороо гарна.
 */
export function ReachBar({ total, segments, className }: {
    total: number;
    segments: ReachSegment[];
    className?: string;
}) {
    const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

    return (
        <div className={cn('mt-3.5 max-w-xl', className)}>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                {segments.filter((s) => !s.track).map((s) => (
                    <span
                        key={s.label}
                        className={cn('block h-full transition-[width] duration-700 ease-out', s.bar)}
                        style={{ width: `${pct(s.value)}%` }}
                    />
                ))}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                {segments.map((s) => (
                    <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-white/55">
                        <span className={cn('size-2 shrink-0 rounded-full', s.bar)} />
                        {s.label}
                        <span className="font-bold tabular-nums text-white/85">{s.value}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

/* ── Сэтгэгдлийн модерацын мөр ─────────────────────────────────────────── */

export interface LabComment {
    id: number;
    body: string;
    user_name: string;
    is_reply: boolean;
    is_pinned: boolean;
    is_hidden: boolean;
    reactions_count: number;
    created_at: string | null;
    /** Тайлангийн жагсаалтад хичээл рүү нь холбоос гаргахад л хэрэгтэй. */
    lesson_id?: number;
    lesson_title?: string | null;
}

/**
 * Админы сэтгэгдлийн мөр — онцлох / нуух / устгах.
 *
 * Үйлдлийн товчнууд хулгана ойртох хүртэл нуугдана, тиймээс жагсаалт
 * уншихад цэвэрхэн байна. Онцолсон сэтгэгдэл зүүн ирмэгээрээ тэмдэглэгдэнэ.
 */
export function LabCommentItem({ comment: c, first, withLesson }: {
    comment: LabComment;
    first: boolean;
    withLesson?: boolean;
}) {
    const showMeta = (withLesson && c.lesson_title) || c.reactions_count > 0;

    return (
        <div
            className={cn(
                'group relative flex gap-2.5 px-3 py-3 transition-colors hover:bg-muted/30 sm:px-4',
                !first && 'border-t',
                c.is_hidden && 'opacity-55',
                c.is_reply && 'pl-8 sm:pl-11',
            )}
        >
            {c.is_pinned && <span className="absolute inset-y-0 left-0 w-[3px] bg-violet-500" />}

            <span className={cn(
                'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                c.is_pinned
                    ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300'
                    : 'bg-muted text-muted-foreground',
            )}>
                {c.user_name.slice(0, 1).toUpperCase()}
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold">{c.user_name}</span>
                    {c.is_reply && <Tag>хариулт</Tag>}
                    {c.is_pinned && <Tag tone="violet">Онцолсон</Tag>}
                    {c.is_hidden && <Tag tone="amber">Нуусан</Tag>}
                    <span className="text-[11px] text-muted-foreground">{c.created_at}</span>
                </div>

                <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed">{c.body}</p>

                {showMeta && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        {withLesson && c.lesson_title && (
                            <Link
                                href={`/admin/lab-training/report/lessons/${c.lesson_id}`}
                                className="inline-flex items-center gap-1 transition-colors hover:text-violet-600 dark:hover:text-violet-400"
                            >
                                <GraduationCap className="size-3" />
                                {c.lesson_title}
                            </Link>
                        )}
                        {c.reactions_count > 0 && (
                            <span className="inline-flex items-center gap-1">
                                <Heart className="size-3" />
                                {c.reactions_count}
                            </span>
                        )}
                    </p>
                )}
            </div>

            <div className="flex shrink-0 items-start gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <IconBtn
                    icon={Pin}
                    label={c.is_pinned ? 'Онцлолыг болих' : 'Онцлох'}
                    active={c.is_pinned}
                    onClick={() => router.post(`/admin/lab-training/comments/${c.id}/pin`, {}, { preserveScroll: true })}
                />
                <IconBtn
                    icon={c.is_hidden ? Eye : EyeOff}
                    label={c.is_hidden ? 'Дахин харуулах' : 'Нуух'}
                    onClick={() => router.post(`/admin/lab-training/comments/${c.id}/hide`, {}, { preserveScroll: true })}
                />
                <IconBtn
                    icon={Trash2}
                    label="Устгах"
                    danger
                    onClick={() => {
                        if (confirm('Энэ сэтгэгдлийг устгах уу?')) {
                            router.delete(`/admin/lab-training/comments/${c.id}`, { preserveScroll: true });
                        }
                    }}
                />
            </div>
        </div>
    );
}

/* ── Модал ─────────────────────────────────────────────────────────────── */

const MODAL_WIDTH = {
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
} as const;

/**
 * Лабын админ хуудсуудын нийтлэг модал.
 *
 * Толгой нь хуудасны кино маягийг үргэлжлүүлж хар өнгөтэй — форм нээгдэхэд
 * ард нь юу байсныг мартахгүй, харин анхаарал цонх руу шилжинэ.
 */
export function LabModal({ title, description, size = 'md', onClose, children }: {
    title: string;
    description?: string;
    size?: keyof typeof MODAL_WIDTH;
    onClose: () => void;
    children: ReactNode;
}) {
    // Esc товчоор хаах — форм дунд гараа хулгана руу авах шаардлагагүй
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-[3px]">
            <div className={cn(
                'my-6 w-full overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-black/25',
                MODAL_WIDTH[size],
            )}>
                <div className="relative flex items-center gap-3 overflow-hidden bg-neutral-950 px-5 py-3.5 text-white">
                    <span className="pointer-events-none absolute -left-10 -top-16 size-44 rounded-full bg-violet-600/30 blur-3xl" />

                    <div className="relative min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold tracking-tight">{title}</h3>
                        {description && (
                            <p className="mt-0.5 truncate text-[11px] text-white/50">{description}</p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        title="Хаах (Esc)"
                        className="relative grid size-7 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>

                <div className="px-5 py-4">{children}</div>
            </div>
        </div>
    );
}

/** Талбарын доорх алдааны мөр. */
export function FieldError({ message }: { message?: string }) {
    return message
        ? <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">{message}</p>
        : null;
}

/** Формын доод талын товчнууд — бүх модалд ижил. */
export function FormActions({ submitLabel, disabled, onCancel }: {
    submitLabel: string; disabled: boolean; onCancel: () => void;
}) {
    return (
        <div className="flex justify-end gap-2 border-t pt-4">
            <button type="button" onClick={onCancel} className={BTN}>Болих</button>
            <button type="submit" disabled={disabled} className={CTA}>{submitLabel}</button>
        </div>
    );
}
