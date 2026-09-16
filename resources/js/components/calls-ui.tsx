import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import {
    ChevronLeft, ChevronRight, LayoutDashboard, ListChecks, PieChart, Settings2,
    ShieldBan, type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Дуудлагын модулийн нийтлэг дүрслэл.
 *
 * ХЭМЖЭЭНИЙ НЭГДСЭН ЖОР: товч бүр 32px өндөр, талбар бүр 36px, дүрс 14px,
 * хүснэгтийн нүд 12px дотор зайтай. Хуудсан дээрх юм бүхэн эдгээрийн аль
 * нэгийг л авна — тиймээс юу ч бусдаасаа том, эсвэл ганцаараа өөр харагдахгүй.
 *
 * ӨНГӨ: модулийн өнгө нь indigo→sky. Аппын үндсэн улаанаас зориуд ялгасан —
 * улаан энд «алдсан дуудлага» гэсэн утга үүрдэг тул навигац, товчинд улаан
 * хэрэглэвэл анхааруулга нь живнэ.
 */

/* ── Гадаргуу ба хэмжээ ────────────────────────────────────────────────── */
export const SURFACE =
    'rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900/60';

export const BTN =
    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium '
    + 'text-foreground transition hover:bg-gray-50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 '
    + 'dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]';

export const CTA =
    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 px-3.5 '
    + 'text-xs font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-sky-700 '
    + 'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40';

export const CTA_LG =
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 px-4 '
    + 'text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-sky-700 '
    + 'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40';

export const INPUT =
    'h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-foreground outline-none transition '
    + 'placeholder:text-muted-foreground/50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 '
    + 'dark:border-white/10 dark:bg-white/[0.03]';

export const AREA =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-foreground outline-none transition '
    + 'placeholder:text-muted-foreground/50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 '
    + 'dark:border-white/10 dark:bg-white/[0.03]';

export const LABEL = 'mb-1.5 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase';

/* ── Өнгөний аяс ───────────────────────────────────────────────────────── */
export type Tone = 'indigo' | 'sky' | 'emerald' | 'amber' | 'red' | 'violet' | 'slate';

export const TONE: Record<Tone, { tile: string; bar: string; text: string; pill: string }> = {
    indigo: {
        tile: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400',
        bar: 'bg-indigo-500',
        text: 'text-indigo-600 dark:text-indigo-400',
        pill: 'bg-indigo-500/12 text-indigo-700 ring-1 ring-indigo-500/20 dark:text-indigo-300',
    },
    sky: {
        tile: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
        bar: 'bg-sky-500',
        text: 'text-sky-600 dark:text-sky-400',
        pill: 'bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300',
    },
    emerald: {
        tile: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
        bar: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
        pill: 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300',
    },
    amber: {
        tile: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
        bar: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        pill: 'bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300',
    },
    red: {
        tile: 'bg-red-500/12 text-red-600 dark:text-red-400',
        bar: 'bg-red-500',
        text: 'text-red-600 dark:text-red-400',
        pill: 'bg-red-500/12 text-red-700 ring-1 ring-red-500/20 dark:text-red-300',
    },
    violet: {
        tile: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
        bar: 'bg-violet-500',
        text: 'text-violet-600 dark:text-violet-400',
        pill: 'bg-violet-500/12 text-violet-700 ring-1 ring-violet-500/20 dark:text-violet-300',
    },
    slate: {
        tile: 'bg-gray-500/10 text-muted-foreground',
        bar: 'bg-gray-400',
        text: 'text-foreground',
        pill: 'bg-gray-500/10 text-muted-foreground ring-1 ring-gray-500/15',
    },
};

/* ── Модулийн навигац ──────────────────────────────────────────────────── */
export type CallsTab = 'dashboard' | 'index' | 'reports' | 'blocked' | 'settings';

const TABS: { key: CallsTab; href: string; label: string; icon: LucideIcon }[] = [
    { key: 'dashboard', href: '/admin/calls/dashboard', label: 'Хянах самбар', icon: LayoutDashboard },
    { key: 'index', href: '/admin/calls', label: 'Бүртгэл', icon: ListChecks },
    { key: 'reports', href: '/admin/calls/reports', label: 'Тайлан', icon: PieChart },
    { key: 'blocked', href: '/admin/calls/blocked', label: 'Спам дугаар', icon: ShieldBan },
    { key: 'settings', href: '/admin/call-settings', label: 'Тохиргоо', icon: Settings2 },
];

/**
 * Модулийн толгой: гарчиг, үйлдэл, доор нь таван хуудсын навигац.
 * Навигацыг таван хуудсанд адилхан байрлуулснаар хэрэглэгч хаана байгаагаа
 * үргэлж нэг л газраас олж хардаг.
 *
 * `current` өгөөгүй бол навигац огт гарахгүй. Ресепшний хуудас яг ийм —
 * дээрх таван хаяг нь админы эрх шаарддаг тул ресепшнд үзүүлбэл дарахад
 * нь 403 буцаана.
 */
export function CallsHeader({ icon: Icon, title, subtitle, current, actions, children }: {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    current?: CallsTab;
    actions?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-white to-sky-50/70 shadow-sm dark:border-indigo-500/20 dark:from-indigo-950/40 dark:via-zinc-900 dark:to-sky-950/20">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-sm shadow-indigo-500/30">
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold tracking-[0.14em] text-indigo-600/70 uppercase dark:text-indigo-400/70">
                        CallPro
                    </p>
                    <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>
                    {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>

            {children}

            {current && (
            <nav className="premium-scroll flex items-center gap-1 overflow-x-auto border-t border-indigo-100/70 bg-white/50 px-2 py-2 dark:border-white/5 dark:bg-black/20">
                {TABS.map((t) => {
                    const active = t.key === current;

                    return (
                        <Link
                            key={t.key}
                            href={t.href}
                            className={cn(
                                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition',
                                active
                                    ? 'bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-sm shadow-indigo-500/25'
                                    : 'text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400',
                            )}
                        >
                            <t.icon className="size-3.5" />
                            {t.label}
                        </Link>
                    );
                })}
            </nav>
            )}
        </div>
    );
}

/* ── Хэсэг (карт) ──────────────────────────────────────────────────────── */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
    return <section className={cn(SURFACE, 'overflow-hidden', className)}>{children}</section>;
}

export function CardHead({ icon: Icon, tone = 'indigo', title, count, hint, actions }: {
    icon?: LucideIcon;
    tone?: Tone;
    title: string;
    count?: number | string;
    hint?: string;
    actions?: ReactNode;
}) {
    return (
        <header className="flex flex-wrap items-center gap-2.5 border-b border-gray-200/80 px-4 py-3 dark:border-white/10">
            {Icon && (
                <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', TONE[tone].tile)}>
                    <Icon className="size-4" />
                </span>
            )}
            <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-1.5 truncate text-sm font-bold tracking-tight">
                    {title}
                    {count !== undefined && (
                        <span className="rounded-md bg-gray-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
                            {count}
                        </span>
                    )}
                </h2>
                {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>}
        </header>
    );
}

/** Картын доторх тайлбар зурвас — толгойн доор, агуулгын дээр. */
export function CardNote({ children }: { children: ReactNode }) {
    return (
        <p className="border-b border-gray-200/80 bg-gray-50/60 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground dark:border-white/10 dark:bg-white/[0.02]">
            {children}
        </p>
    );
}

/* ── Үзүүлэлт ──────────────────────────────────────────────────────────── */
/**
 * Дээд ирмэг дээрх өнгөт зурвас нь харьцаа өгсөн үед явцын шугам болж
 * ажиллана, эс бөгөөс бүтнээрээ дүүрч зөвхөн тухайн нүдний өнгийг тэмдэглэнэ.
 * Ингэснээр бүх нүд ижил өндөртэй хэвээр үлдэнэ.
 */
export function Stat({ tone = 'slate', icon: Icon, label, value, hint, percent }: {
    tone?: Tone;
    icon?: LucideIcon;
    label: string;
    value: string | number;
    hint?: string;
    percent?: number;
}) {
    const fill = percent === undefined ? 100 : Math.min(100, Math.max(0, percent));

    return (
        <div className={cn(SURFACE, 'relative overflow-hidden px-4 pt-3.5 pb-3')}>
            <span className="absolute inset-x-0 top-0 h-[3px] bg-gray-500/10">
                <span
                    className={cn('block h-full transition-[width] duration-700 ease-out', TONE[tone].bar)}
                    style={{ width: `${fill}%` }}
                />
            </span>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {Icon && (
                    <span className={cn('grid size-5 shrink-0 place-items-center rounded', TONE[tone].tile)}>
                        <Icon className="size-3" />
                    </span>
                )}
                <span className="truncate">{label}</span>
            </div>
            <p className={cn('mt-1.5 text-2xl font-bold tracking-tight tabular-nums', TONE[tone].text)}>{value}</p>
            {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
        </div>
    );
}

/** Нягт хэлбэрийн үзүүлэлт — толгойн доторх нэг мөрөнд багцаар нь тавина. */
export function InlineStat({ label, value, tone = 'slate', title }: {
    label: string; value: string | number; tone?: Tone; title?: string;
}) {
    return (
        <div className="px-3 py-2.5 text-center" title={title}>
            <p className="truncate text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
            <p className={cn('truncate text-base font-bold tabular-nums', TONE[tone].text)}>{value}</p>
        </div>
    );
}

/* ── Шошго ─────────────────────────────────────────────────────────────── */
export function Pill({ tone = 'slate', icon: Icon, children, className }: {
    tone?: Tone; icon?: LucideIcon; children: ReactNode; className?: string;
}) {
    return (
        <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
            TONE[tone].pill, className,
        )}>
            {Icon && <Icon className="size-3" />}
            {children}
        </span>
    );
}

/* ── Хүснэгт ───────────────────────────────────────────────────────────── */
export const TABLE = 'w-full text-sm';
export const THEAD =
    'border-b border-gray-200/80 bg-gray-50/70 text-left text-[11px] font-semibold tracking-wide '
    + 'text-muted-foreground uppercase dark:border-white/10 dark:bg-white/[0.03]';
export const TH = 'px-3 py-2.5 font-semibold whitespace-nowrap';
export const TR = 'border-b border-gray-100 transition-colors last:border-0 hover:bg-indigo-500/[0.04] dark:border-white/5';
export const TD = 'px-3 py-2.5';

export function TableWrap({ children }: { children: ReactNode }) {
    return <div className="premium-scroll overflow-x-auto">{children}</div>;
}

/* ── Хуудаслалт ────────────────────────────────────────────────────────── */
export interface PageMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

/**
 * Хүснэгтийн доод мөр: хэдэн бичлэгээс хэдийг харж байгаа, мөрийн тоо, хуудсууд.
 *
 * Нэг хуудсанд багтсан ч ХАРАГДАНА — «нийт хэд байна вэ» гэдэг нь хуудас олон
 * эсэхээс үл хамааран хэрэгтэй мэдээлэл. Хуудасны товчнууд л нуугдана.
 *
 * Laravel-ийн `links` дэх шошгыг HTML болгож оруулахгүй: тэнд «&laquo; Previous»
 * гэсэн англи текст ирдэг тул эхний/сүүлийнхийг нь өөрсдөө сум болгоно.
 */
export function Pagination({ meta, onPerPage }: {
    meta: PageMeta;
    onPerPage?: (n: number) => void;
}) {
    const pages = meta.links.slice(1, -1);
    const prev = meta.links[0];
    const next = meta.links[meta.links.length - 1];

    const go = (url: string | null) => {
        if (url) {
            router.visit(url, { preserveState: true, preserveScroll: true });
        }
    };

    return (
        <div className={cn(SURFACE, 'flex flex-wrap items-center justify-between gap-3 px-4 py-2.5')}>
            <p className="text-xs text-muted-foreground">
                {meta.total === 0 ? (
                    'Бичлэг алга'
                ) : (
                    <>
                        Нийт <span className="font-semibold text-foreground tabular-nums">{meta.total.toLocaleString()}</span>
                        {' бичлэгээс '}
                        <span className="font-semibold text-foreground tabular-nums">{meta.from}–{meta.to}</span>
                    </>
                )}
            </p>

            <div className="flex flex-wrap items-center gap-3">
                {onPerPage && (
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Мөр:
                        <select
                            value={meta.per_page}
                            onChange={(e) => onPerPage(Number(e.target.value))}
                            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-foreground outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/[0.03]"
                        >
                            {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                )}

                {meta.last_page > 1 && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => go(prev?.url ?? null)}
                            disabled={!prev?.url}
                            title="Өмнөх"
                            aria-label="Өмнөх хуудас"
                            className={cn(PAGE_BTN, 'px-2')}
                        >
                            <ChevronLeft className="size-3.5" />
                        </button>

                        {pages.map((l, i) => (
                            <button
                                key={i}
                                onClick={() => go(l.url)}
                                disabled={!l.url}
                                className={cn(
                                    PAGE_BTN,
                                    l.active && 'border-transparent bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-sm shadow-indigo-500/25',
                                )}
                            >
                                {l.label}
                            </button>
                        ))}

                        <button
                            onClick={() => go(next?.url ?? null)}
                            disabled={!next?.url}
                            title="Дараах"
                            aria-label="Дараах хуудас"
                            className={cn(PAGE_BTN, 'px-2')}
                        >
                            <ChevronRight className="size-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const PAGE_BTN =
    'grid h-8 min-w-8 place-items-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold '
    + 'text-muted-foreground transition hover:bg-gray-50 hover:text-foreground disabled:pointer-events-none '
    + 'disabled:opacity-30 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]';

/* ── Хоосон төлөв ──────────────────────────────────────────────────────── */
export function Empty({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
    return (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-gray-500/10 text-muted-foreground/50">
                <Icon className="size-5" />
            </span>
            <p className="text-sm font-semibold text-muted-foreground">{title}</p>
            {hint && <p className="max-w-sm text-xs text-muted-foreground/70">{hint}</p>}
        </div>
    );
}

/* ── Маягтын талбар ────────────────────────────────────────────────────── */
export function Field({ label, error, className, children }: {
    label: string; error?: string; className?: string; children: ReactNode;
}) {
    return (
        <div className={className}>
            <label className={LABEL}>{label}</label>
            {children}
            {error && <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>}
        </div>
    );
}

/** Шүүлтүүрийн мөр — бүх хуудсанд ижил өндөр, ижил зайтай. */
export function FilterBar({ children }: { children: ReactNode }) {
    return <div className={cn(SURFACE, 'flex flex-wrap items-end gap-3 p-3.5')}>{children}</div>;
}

/** Хайрцаглаж хийсэн сонголтын хэсэг. */
export function Segmented<T extends string>({ value, options, onChange }: {
    value: T;
    options: { key: T; label: string }[];
    onChange: (key: T) => void;
}) {
    return (
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100/60 p-0.5 dark:border-white/10 dark:bg-white/[0.03]">
            {options.map((o) => (
                <button
                    key={o.key}
                    type="button"
                    onClick={() => onChange(o.key)}
                    className={cn(
                        'h-8 rounded-md px-3 text-xs font-semibold transition',
                        value === o.key
                            ? 'bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/** Дүрсэн товч — хүснэгтийн мөрийн үйлдэлд. */
export function IconBtn({ icon: Icon, title, tone = 'slate', onClick }: {
    icon: LucideIcon; title: string; tone?: Tone; onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={cn(
                'grid size-8 shrink-0 place-items-center rounded-lg border border-transparent transition active:scale-95',
                tone === 'red'
                    ? 'text-red-600 hover:border-red-500/20 hover:bg-red-500/10'
                    : 'text-muted-foreground hover:border-gray-200 hover:bg-gray-500/10 hover:text-foreground dark:hover:border-white/10',
            )}
        >
            <Icon className="size-4" />
        </button>
    );
}

/** Асаах/унтраах шилжүүлэгч — checkbox-ийн оронд. */
export function Switch({ checked, onChange, label, hint }: {
    checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-2.5">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={cn(
                    'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors',
                    checked ? 'bg-gradient-to-r from-indigo-500 to-sky-600' : 'bg-gray-300 dark:bg-white/15',
                )}
            >
                <span
                    className={cn(
                        'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform',
                        checked && 'translate-x-4',
                    )}
                />
            </button>
            <span className="text-sm">
                {label}
                {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
            </span>
        </label>
    );
}
