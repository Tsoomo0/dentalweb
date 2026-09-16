import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { CheckCircle2, ChevronRight, Circle, Clock, FileText, Play, PlayCircle, Video, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

/**
 * Сургалтын хэсгийн нийтлэг дүрслэлийн элементүүд.
 *
 * Каталог, хичээл, шалгалтын хуудсууд эдгээрийг л ашиглана — ингэснээр
 * өнгө, радиус, зай, үсгийн хэмжээ бүх хуудсанд яг ижил байна.
 */

/** Үндсэн гадаргуу — бүх карт, самбар үүн дээр суурилна. */
export const CARD = 'rounded-2xl border bg-card shadow-sm';

/** Дарж болох карт дээр нэмэгдэх хөдөлгөөн. */
export const CARD_HOVER =
    'transition-[border-color,box-shadow] duration-300 hover:border-violet-300/80 hover:shadow-lg hover:shadow-violet-900/[0.06] dark:hover:border-violet-500/40 dark:hover:shadow-black/20';

/** Талбар (input, textarea) — бүх хуудсанд нэг загвар. */
export const FIELD =
    'w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:focus:border-violet-500/60';

/** Гол үйлдлийн товч. */
export const BTN_PRIMARY =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 transition hover:bg-violet-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

/** Хоёрдогч товч. */
export const BTN_GHOST =
    'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-muted/60 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

export type Tone = 'violet' | 'emerald' | 'amber' | 'rose' | 'sky' | 'indigo' | 'orange' | 'slate';

/** Төлөв тус бүрийн өнгөний багц — гэрэл/харанхуй горимд аль алинд нь тохирно. */
export const TONE: Record<Tone, {
    chip: string; tile: string; bar: string; text: string;
    /** Бүтэн хэсгийн бүдэг дэвсгэр — ангилал бүрийг ялгаж харуулна. */
    surface: string;
    /** Тухайн хэсгийн хүрээ. */
    edge: string;
}> = {
    violet: {
        chip: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
        tile: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
        bar: 'bg-violet-500',
        text: 'text-violet-600 dark:text-violet-400',
        surface: 'bg-violet-50/70 dark:bg-violet-500/[0.07]',
        edge: 'border-violet-200/70 dark:border-violet-500/20',
    },
    emerald: {
        chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        tile: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
        bar: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
        surface: 'bg-emerald-50/70 dark:bg-emerald-500/[0.07]',
        edge: 'border-emerald-200/70 dark:border-emerald-500/20',
    },
    amber: {
        chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        tile: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
        bar: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        surface: 'bg-amber-50/70 dark:bg-amber-500/[0.07]',
        edge: 'border-amber-200/70 dark:border-amber-500/20',
    },
    rose: {
        chip: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
        tile: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
        bar: 'bg-rose-500',
        text: 'text-rose-600 dark:text-rose-400',
        surface: 'bg-rose-50/70 dark:bg-rose-500/[0.07]',
        edge: 'border-rose-200/70 dark:border-rose-500/20',
    },
    sky: {
        chip: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
        tile: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
        bar: 'bg-sky-500',
        text: 'text-sky-600 dark:text-sky-400',
        surface: 'bg-sky-50/70 dark:bg-sky-500/[0.07]',
        edge: 'border-sky-200/70 dark:border-sky-500/20',
    },
    indigo: {
        chip: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
        tile: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
        bar: 'bg-indigo-500',
        text: 'text-indigo-600 dark:text-indigo-400',
        surface: 'bg-indigo-50/70 dark:bg-indigo-500/[0.07]',
        edge: 'border-indigo-200/70 dark:border-indigo-500/20',
    },
    orange: {
        chip: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
        tile: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
        bar: 'bg-orange-500',
        text: 'text-orange-600 dark:text-orange-400',
        surface: 'bg-orange-50/70 dark:bg-orange-500/[0.07]',
        edge: 'border-orange-200/70 dark:border-orange-500/20',
    },
    slate: {
        chip: 'bg-muted text-muted-foreground',
        tile: 'bg-muted text-muted-foreground',
        bar: 'bg-muted-foreground/40',
        text: 'text-muted-foreground',
        surface: 'bg-muted/40',
        edge: 'border-border',
    },
};

/* ── Жижиг шошго ───────────────────────────────────────────────────────── */
export function Chip({ tone = 'slate', icon: Icon, children, className }: {
    tone?: Tone;
    icon?: LucideIcon;
    children: ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none',
                TONE[tone].chip,
                className,
            )}
        >
            {Icon && <Icon className="size-3 shrink-0" />}
            {children}
        </span>
    );
}

/* ── Явцын шугам ───────────────────────────────────────────────────────── */
export function ProgressBar({ percent, tone = 'violet', className }: {
    percent: number;
    tone?: Tone;
    className?: string;
}) {
    const value = Math.min(100, Math.max(0, percent));

    return (
        <span
            role="progressbar"
            aria-valuenow={Math.round(value)}
            aria-valuemin={0}
            aria-valuemax={100}
            className={cn('block h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10', className)}
        >
            <span
                className={cn('block h-full rounded-full transition-[width] duration-700 ease-out', TONE[tone].bar)}
                style={{ width: `${value}%` }}
            />
        </span>
    );
}

/* ── Үзүүлэлтийн нүд ───────────────────────────────────────────────────── */
export function StatTile({ icon: Icon, label, value, hint, tone = 'slate' }: {
    icon: LucideIcon;
    label: string;
    value: string | number;
    hint?: string;
    tone?: Tone;
}) {
    return (
        <div className={cn(CARD, 'flex items-center gap-3.5 p-4')}>
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TONE[tone].tile)}>
                <Icon className="size-5" />
            </span>
            <div className="min-w-0">
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                </p>
                <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-lg font-bold leading-tight tabular-nums sm:text-xl">{value}</span>
                    {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
                </p>
            </div>
        </div>
    );
}

/* ── Хэсгийн гарчиг ────────────────────────────────────────────────────── */
export function SectionHeader({ icon: Icon, title, count, description, action, className }: {
    icon?: LucideIcon;
    title: string;
    count?: number;
    description?: string | null;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex items-center justify-between gap-4', className)}>
            <div className="flex min-w-0 items-center gap-2.5">
                {Icon && (
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                        <Icon className="size-4" />
                    </span>
                )}
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
                        <span className="truncate">{title}</span>
                        {count !== undefined && (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                                {count}
                            </span>
                        )}
                    </h2>
                    {description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{description}</p>
                    )}
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

/* ── Хоосон төлөв ──────────────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, description, action, className }: {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-14 text-center',
                className,
            )}
        >
            <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground/70">
                <Icon className="size-6" />
            </span>
            <p className="mt-1 text-sm font-semibold">{title}</p>
            {description && <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

/* ── Туслах хөрвүүлэлтүүд ──────────────────────────────────────────────── */

/** 135 → "2ц 15м" — нарийн нүдэнд ч багтахаар товч бичнэ. */
export function humanMinutes(minutes: number): string {
    const total = Math.max(0, Math.round(minutes));
    if (total < 60) return `${total} мин`;

    const h = Math.floor(total / 60);
    const m = total % 60;

    return m > 0 ? `${h}ц ${m}м` : `${h} цаг`;
}

/** Байтыг уншихад ойлгомжтой хэмжээ болгоно. */
export function humanSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ── Ангилалын дүрсний бүртгэл ─────────────────────────────────────────── */
import {
    Braces, Cog, FlaskConical, Folder, Gem, Layers, ScanLine, Sparkles, Wrench,
} from 'lucide-react';

/** Админ талд сонгосон дүрсний түлхүүрийг бодит дүрс рүү хөрвүүлнэ. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
    folder: Folder,
    layers: Layers,
    gem: Gem,
    cog: Cog,
    scan: ScanLine,
    braces: Braces,
    flask: FlaskConical,
    wrench: Wrench,
    sparkles: Sparkles,
};

export function categoryIcon(key: string | null | undefined): LucideIcon {
    return CATEGORY_ICONS[key ?? 'folder'] ?? Folder;
}

/**
 * Бүтэн ангилалын блок — өөрийн бүдэг дэвсгэр, өнгөт толгойтой.
 * Ингэснээр олон ангилал доош урсахад нүд хаана байгаагаа алдахгүй.
 */
export function CategoryBlock({ tone = 'slate', icon: Icon, title, description, meta, children }: {
    tone?: Tone;
    icon: LucideIcon;
    title: string;
    description?: string | null;
    meta?: ReactNode;
    children: ReactNode;
}) {
    const t = TONE[tone];

    return (
        <section className={cn('overflow-hidden rounded-3xl border', t.edge, t.surface)}>
            <header className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
                <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', t.tile)}>
                    <Icon className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold tracking-tight sm:text-lg">{title}</h2>
                    {description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{description}</p>
                    )}
                </div>

                {meta}
            </header>

            <div className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4">{children}</div>
        </section>
    );
}

/* ── Хичээлийн карт ────────────────────────────────────────────────────── */
export interface LessonCardData {
    id: number;
    title: string;
    poster_url: string | null;
    duration_label: string;
    progress: number;
    is_completed: boolean;
    is_required: boolean;
    due_at: string | null;
    is_overdue: boolean;
}

export function LessonCard({ lesson, index, tone = 'violet' }: { lesson: LessonCardData; index: number; tone?: Tone }) {
    return (
        <li>
            <Link
                href={`/my/training/lessons/${lesson.id}`}
                className={cn(
                    CARD, CARD_HOVER,
                    'group block h-full overflow-hidden transition-transform duration-300 hover:-translate-y-0.5',
                )}
            >
                {/* Зураг */}
                <div className="relative aspect-video overflow-hidden bg-neutral-900">
                    {lesson.poster_url ? (
                        <img
                            src={lesson.poster_url}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="grid size-full place-items-center bg-gradient-to-br from-neutral-800 to-neutral-950">
                            <Video className="size-7 text-white/25" />
                        </div>
                    )}

                    {/* Тоглуулах давхарга */}
                    <div className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="grid size-12 place-items-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur-md">
                            <Play className="ml-0.5 size-5 fill-white text-white" />
                        </span>
                    </div>

                    {/* Дугаар */}
                    <span className="absolute left-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white backdrop-blur">
                        {String(index).padStart(2, '0')}
                    </span>

                    {/* Төлөв */}
                    <div className="absolute right-2 top-2 flex items-center gap-1.5">
                        {lesson.is_overdue ? (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                                Хоцорсон
                            </span>
                        ) : lesson.is_required && !lesson.is_completed ? (
                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                                Заавал
                            </span>
                        ) : null}

                        {lesson.is_completed && (
                            <span className="grid size-6 place-items-center rounded-full bg-emerald-500 text-white shadow">
                                <CheckCircle2 className="size-4" />
                            </span>
                        )}
                    </div>

                    {/* Урт */}
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white backdrop-blur">
                        {lesson.duration_label}
                    </span>

                    {/* Үргэлжлүүлэх зурвас */}
                    {lesson.progress > 0 && !lesson.is_completed && (
                        <span className="absolute inset-x-0 bottom-0 h-1 bg-black/45">
                            <span
                                className={cn('block h-full', TONE[tone].bar)}
                                style={{ width: `${lesson.progress}%` }}
                            />
                        </span>
                    )}
                </div>

                {/* Гарчиг ба төлөв */}
                <div className="p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug transition group-hover:text-violet-600 dark:group-hover:text-violet-400">
                        {lesson.title}
                    </p>

                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium">
                        {lesson.is_completed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-3" />
                                Үзэж дууссан
                            </span>
                        ) : lesson.progress > 0 ? (
                            <span className={cn('inline-flex items-center gap-1', TONE[tone].text)}>
                                <PlayCircle className="size-3" />
                                {lesson.progress}% үзсэн
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Circle className="size-3" />
                                Эхлээгүй
                            </span>
                        )}

                        {lesson.due_at && !lesson.is_completed && (
                            <span
                                className={cn(
                                    'ml-auto inline-flex items-center gap-1',
                                    lesson.is_overdue ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
                                )}
                            >
                                <Clock className="size-3" />
                                {lesson.due_at}
                            </span>
                        )}
                    </p>
                </div>
            </Link>
        </li>
    );
}

/* ── Баримт хичээлийн мөр ──────────────────────────────────────────────── */
/**
 * Файл сургалтын хичээл нь постергүй — тиймээс картаар биш МӨРӨӨР эгнэнэ.
 * Баримтыг хүн гарчгаар нь хайдаг болохоос зургаар нь таньдаггүй, мөн нэг
 * дэлгэцэнд илүү олон мөр багтаж бүхэл багц нь нэг харцанд харагдана.
 */
export interface DocumentRowData extends LessonCardData {
    page_count?: number;
    description?: string | null;
}

export function DocumentRow({ lesson, index, tone = 'sky' }: {
    lesson: DocumentRowData;
    index: number;
    tone?: Tone;
}) {
    const pages = lesson.page_count && lesson.page_count > 0 ? lesson.page_count : null;

    return (
        <li>
            <Link
                href={`/my/training/lessons/${lesson.id}`}
                className="group flex items-center gap-3 border-b px-3 py-2.5 transition last:border-b-0 hover:bg-muted/50 sm:px-4"
            >
                <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground/60">
                    {index}
                </span>

                <span className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-xl',
                    lesson.is_completed ? TONE.emerald.tile : TONE[tone].tile,
                )}>
                    {lesson.is_completed ? <CheckCircle2 className="size-4" /> : <FileText className="size-4" />}
                </span>

                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-semibold leading-snug transition group-hover:text-violet-600 dark:group-hover:text-violet-400">
                            {lesson.title}
                        </span>

                        {lesson.is_overdue ? (
                            <Chip tone="rose">Хоцорсон</Chip>
                        ) : lesson.is_required && !lesson.is_completed ? (
                            <Chip tone="amber">Заавал</Chip>
                        ) : null}
                    </span>

                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {pages && <span className="tabular-nums">{pages} хуудас</span>}

                        {lesson.is_completed ? (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">Уншиж дууссан</span>
                        ) : lesson.progress > 0 ? (
                            <span className={cn('font-medium tabular-nums', TONE[tone].text)}>
                                {lesson.progress}% уншсан
                            </span>
                        ) : (
                            <span>Эхлээгүй</span>
                        )}

                        {lesson.due_at && !lesson.is_completed && (
                            <span className={cn(
                                'flex items-center gap-1 tabular-nums',
                                lesson.is_overdue && 'font-semibold text-rose-600 dark:text-rose-400',
                            )}>
                                <Clock className="size-3" />
                                {lesson.due_at}
                            </span>
                        )}
                    </span>
                </span>

                {/* Явц — мөрийн баруун ирмэг дээр нимгэн шугам */}
                <span className="hidden w-24 shrink-0 sm:block">
                    <ProgressBar
                        percent={lesson.progress}
                        tone={lesson.is_completed ? 'emerald' : tone}
                    />
                </span>

                <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
        </li>
    );
}
