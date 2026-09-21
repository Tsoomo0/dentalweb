import { ChevronLeft, ChevronRight, Search, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * HR хэсгийн хуудсуудын НЭГДСЭН ЗАГВАР.
 *
 * «Гэрээ / АБТ» хуудсанд анх гарсан харагдацыг энд нэг удаа тодорхойлж,
 * бүх HR хуудас ижил толгой самбар, шүүлтүүрийн мөр, жагсаалтын хүрээ,
 * хоосон төлөв, хуудаслалтыг хуваалцана.  Хуудас бүр зөвхөн ӨНГӨӨРӨӨ
 * (tone) ялгаатай — бүтэц нь адилхан.
 *
 * Хэрэглэх жишээ:
 *   <HrPanel tone="rose" icon={Users} title="Ажилтнууд" badge="35 бүртгэл"
 *            steps={['Бүртгэх', 'Гэрээ', 'Цалин']}
 *            actions={<HrButton tone="rose" icon={Plus}>Ажилтан нэмэх</HrButton>}
 *            tabs={<HrTabs … />} filters={<HrSelect …/>} />
 */

export type HrTone = 'emerald' | 'rose' | 'violet' | 'sky' | 'amber' | 'blue' | 'teal' | 'indigo';

interface ToneStyle {
    /** Самбарын дэвсгэр градиент */
    panel: string;
    /** Самбарын сүүдэр */
    shadow: string;
    blobA: string;
    blobB: string;
    line: string;
    /** Дүрсний градиент */
    icon: string;
    badge: string;
    step: string;
    /** Оролтын фокус */
    focus: string;
    /** Үндсэн товчны градиент */
    btn: string;
    /** Идэвхтэй табын градиент */
    tab: string;
    /** Торон бүтцийн өнгө (RGB) */
    gridRgb: string;
}

export const HR_TONES: Record<HrTone, ToneStyle> = {
    emerald: {
        panel: 'from-emerald-50/80 via-card to-teal-50/50 dark:from-emerald-950/30 dark:via-card dark:to-teal-950/20',
        shadow: 'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(16,185,129,0.35)]',
        blobA: 'bg-emerald-400/25 dark:bg-emerald-500/20',
        blobB: 'bg-teal-400/20 dark:bg-teal-500/15',
        line: 'via-emerald-400/70',
        icon: 'from-emerald-400 via-emerald-500 to-teal-600 shadow-emerald-600/35',
        badge: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
        step: 'text-emerald-500/50',
        focus: 'focus:border-emerald-500/60 focus:ring-emerald-500/10',
        btn: 'from-emerald-500 to-emerald-600 shadow-emerald-600/35 hover:shadow-emerald-600/45',
        tab: 'from-emerald-500 to-emerald-600 shadow-emerald-600/40',
        gridRgb: '16 185 129',
    },
    rose: {
        panel: 'from-rose-50/80 via-card to-orange-50/50 dark:from-rose-950/30 dark:via-card dark:to-orange-950/20',
        shadow: 'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(244,63,94,0.35)]',
        blobA: 'bg-rose-400/25 dark:bg-rose-500/20',
        blobB: 'bg-orange-400/20 dark:bg-orange-500/15',
        line: 'via-rose-400/70',
        icon: 'from-rose-400 via-rose-500 to-red-600 shadow-rose-600/35',
        badge: 'bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300',
        step: 'text-rose-500/50',
        focus: 'focus:border-rose-500/60 focus:ring-rose-500/10',
        btn: 'from-rose-500 to-rose-600 shadow-rose-600/35 hover:shadow-rose-600/45',
        tab: 'from-rose-500 to-rose-600 shadow-rose-600/40',
        gridRgb: '244 63 94',
    },
    violet: {
        panel: 'from-violet-50/80 via-card to-fuchsia-50/50 dark:from-violet-950/30 dark:via-card dark:to-fuchsia-950/20',
        shadow: 'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(139,92,246,0.35)]',
        blobA: 'bg-violet-400/25 dark:bg-violet-500/20',
        blobB: 'bg-fuchsia-400/20 dark:bg-fuchsia-500/15',
        line: 'via-violet-400/70',
        icon: 'from-violet-400 via-violet-500 to-purple-600 shadow-violet-600/35',
        badge: 'bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300',
        step: 'text-violet-500/50',
        focus: 'focus:border-violet-500/60 focus:ring-violet-500/10',
        btn: 'from-violet-500 to-violet-600 shadow-violet-600/35 hover:shadow-violet-600/45',
        tab: 'from-violet-500 to-violet-600 shadow-violet-600/40',
        gridRgb: '139 92 246',
    },
    sky: {
        panel: 'from-sky-50/80 via-card to-cyan-50/50 dark:from-sky-950/30 dark:via-card dark:to-cyan-950/20',
        shadow: 'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(14,165,233,0.35)]',
        blobA: 'bg-sky-400/25 dark:bg-sky-500/20',
        blobB: 'bg-cyan-400/20 dark:bg-cyan-500/15',
        line: 'via-sky-400/70',
        icon: 'from-sky-400 via-sky-500 to-cyan-600 shadow-sky-600/35',
        badge: 'bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300',
        step: 'text-sky-500/50',
        focus: 'focus:border-sky-500/60 focus:ring-sky-500/10',
        btn: 'from-sky-500 to-sky-600 shadow-sky-600/35 hover:shadow-sky-600/45',
        tab: 'from-sky-500 to-sky-600 shadow-sky-600/40',
        gridRgb: '14 165 233',
    },
    amber: {
        panel: 'from-amber-50/80 via-card to-orange-50/50 dark:from-amber-950/30 dark:via-card dark:to-orange-950/20',
        shadow: 'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(245,158,11,0.35)]',
        blobA: 'bg-amber-400/25 dark:bg-amber-500/20',
        blobB: 'bg-orange-400/20 dark:bg-orange-500/15',
        line: 'via-amber-400/70',
        icon: 'from-amber-400 via-amber-500 to-orange-600 shadow-amber-600/35',
        badge: 'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300',
        step: 'text-amber-500/50',
        focus: 'focus:border-amber-500/60 focus:ring-amber-500/10',
        btn: 'from-amber-500 to-amber-600 shadow-amber-600/35 hover:shadow-amber-600/45',
        tab: 'from-amber-400 to-amber-500 shadow-amber-500/40',
        gridRgb: '245 158 11',
    },
    blue: {
        panel: 'from-blue-50/80 via-card to-indigo-50/50 dark:from-blue-950/30 dark:via-card dark:to-indigo-950/20',
        shadow: 'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(59,130,246,0.35)]',
        blobA: 'bg-blue-400/25 dark:bg-blue-500/20',
        blobB: 'bg-indigo-400/20 dark:bg-indigo-500/15',
        line: 'via-blue-400/70',
        icon: 'from-blue-400 via-blue-500 to-indigo-600 shadow-blue-600/35',
        badge: 'bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-300',
        step: 'text-blue-500/50',
        focus: 'focus:border-blue-500/60 focus:ring-blue-500/10',
        btn: 'from-blue-500 to-blue-600 shadow-blue-600/35 hover:shadow-blue-600/45',
        tab: 'from-blue-500 to-blue-600 shadow-blue-600/40',
        gridRgb: '59 130 246',
    },
    teal: {
        panel: 'from-teal-50/80 via-card to-emerald-50/50 dark:from-teal-950/30 dark:via-card dark:to-emerald-950/20',
        shadow: 'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(20,184,166,0.35)]',
        blobA: 'bg-teal-400/25 dark:bg-teal-500/20',
        blobB: 'bg-emerald-400/20 dark:bg-emerald-500/15',
        line: 'via-teal-400/70',
        icon: 'from-teal-400 via-teal-500 to-emerald-600 shadow-teal-600/35',
        badge: 'bg-teal-500/10 text-teal-700 ring-teal-500/25 dark:text-teal-300',
        step: 'text-teal-500/50',
        focus: 'focus:border-teal-500/60 focus:ring-teal-500/10',
        btn: 'from-teal-500 to-teal-600 shadow-teal-600/35 hover:shadow-teal-600/45',
        tab: 'from-teal-500 to-teal-600 shadow-teal-600/40',
        gridRgb: '20 184 166',
    },
    indigo: {
        panel: 'from-indigo-50/80 via-card to-violet-50/50 dark:from-indigo-950/30 dark:via-card dark:to-violet-950/20',
        shadow: 'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(99,102,241,0.35)]',
        blobA: 'bg-indigo-400/25 dark:bg-indigo-500/20',
        blobB: 'bg-violet-400/20 dark:bg-violet-500/15',
        line: 'via-indigo-400/70',
        icon: 'from-indigo-400 via-indigo-500 to-violet-600 shadow-indigo-600/35',
        badge: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/25 dark:text-indigo-300',
        step: 'text-indigo-500/50',
        focus: 'focus:border-indigo-500/60 focus:ring-indigo-500/10',
        btn: 'from-indigo-500 to-indigo-600 shadow-indigo-600/35 hover:shadow-indigo-600/45',
        tab: 'from-indigo-500 to-indigo-600 shadow-indigo-600/40',
        gridRgb: '99 102 241',
    },
};

/* ───────────────────────── Толгой самбар ───────────────────────── */

export function HrPanel({
    tone = 'emerald', icon: Icon, avatar, title, badge, steps, subtitle, actions, tabs, filters, children,
}: {
    tone?: HrTone;
    icon?: LucideIcon;
    /** Дүрсний оронд харагдах зүйл (ажилтны хөрөг гэх мэт) */
    avatar?: ReactNode;
    title: string;
    badge?: ReactNode;
    /** Урсгалын алхмууд — гарчгийн доор сумтай харагдана */
    steps?: string[];
    /** Алхам биш, зүгээр тайлбар мөр (steps өгөөгүй үед) */
    subtitle?: ReactNode;
    /** Баруун талын хэсэг — хайлт, товч, тоолуур */
    actions?: ReactNode;
    /** Доод мөрийн зүүн тал — түргэн шүүлтүүрийн табууд */
    tabs?: ReactNode;
    /** Доод мөрийн баруун тал — select-үүд */
    filters?: ReactNode;
    /** Толгойн доор нэмэлт хэсэг (жишээ нь статистик хавтан) */
    children?: ReactNode;
}) {
    const t = HR_TONES[tone];

    return (
        <section
            style={{ ['--hr-grid-rgb' as string]: t.gridRgb }}
            className={`relative isolate overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br ${t.panel} ${t.shadow}`}>
            {/* Гоёл — хөвөгч туяа ба нарийн торон бүтэц */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div className={`hr-drift absolute -left-20 -top-28 size-64 rounded-full blur-3xl ${t.blobA}`} />
                <div className={`hr-drift-2 absolute -right-16 -top-32 size-64 rounded-full blur-3xl ${t.blobB}`} />
                <div className="hr-drift-2 absolute -bottom-32 left-1/3 size-56 rounded-full bg-sky-400/10 blur-3xl" />
                <div className="hr-grid absolute inset-0 opacity-[0.55]" />
                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${t.line}`} />
            </div>

            <div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-3 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                    {avatar ?? (
                        <span className={`relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ring-1 ring-inset ring-white/30 ${t.icon}`}>
                            <span aria-hidden className="absolute inset-x-1.5 top-1 h-1/3 rounded-full bg-white/25 blur-[2px]" />
                            {Icon && <Icon className="relative size-5" />}
                        </span>
                    )}
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-lg font-extrabold leading-none tracking-tight text-transparent">
                                {title}
                            </h1>
                            {badge && (
                                <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset sm:inline ${t.badge}`}>
                                    {badge}
                                </span>
                            )}
                        </div>
                        {steps && steps.length > 0 ? (
                            <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] leading-none text-muted-foreground">
                                {steps.map((step, i) => (
                                    <span key={step} className="inline-flex items-center gap-1">
                                        {i > 0 && <ChevronRight className={`size-3 ${t.step}`} />}
                                        {step}
                                    </span>
                                ))}
                            </p>
                        ) : subtitle ? (
                            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] leading-none text-muted-foreground">
                                {subtitle}
                            </p>
                        ) : null}
                    </div>
                </div>

                {actions && (
                    <div className="flex flex-1 shrink-0 items-center justify-end gap-2">{actions}</div>
                )}
            </div>

            {children}

            {(tabs || filters) && (
                <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-border/50 bg-background/40 px-3 py-2 backdrop-blur-sm">
                    <div className="flex items-center gap-1 overflow-x-auto">{tabs}</div>
                    <div className="flex items-center gap-2">{filters}</div>
                </div>
            )}
        </section>
    );
}

/* ───────────────────────── Түргэн шүүлтүүрийн таб ───────────────────────── */

export interface HrTabItem {
    key: string;
    label: string;
    value?: number;
    Icon?: LucideIcon;
    /** Идэвхтэй үеийн градиентыг дарж бичих */
    on?: string;
}

export function HrTabs({ items, active, onChange, tone = 'emerald' }: {
    items: HrTabItem[];
    active: string;
    onChange: (key: string) => void;
    tone?: HrTone;
}) {
    const t = HR_TONES[tone];

    return (
        <>
            {items.map(({ key, label, value, Icon, on }) => {
                const isActive = active === key;

                return (
                    <button key={key || 'all'} onClick={() => onChange(key)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all active:scale-[0.97] ${
                            isActive
                                ? `bg-gradient-to-b ${on ?? t.tab} text-white shadow-md ring-1 ring-inset ring-white/25`
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                        {Icon && <Icon className="size-3.5 shrink-0" />}
                        {label}
                        {value !== undefined && (
                            <span className={`rounded px-1 text-[10px] font-semibold tabular-nums ${
                                isActive ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'}`}>
                                {value}
                            </span>
                        )}
                    </button>
                );
            })}
        </>
    );
}

/* ───────────────────────── Хайлт ───────────────────────── */

export function HrSearch({ value, onChange, placeholder = 'Хайх…', tone = 'emerald', className = '' }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    tone?: HrTone;
    className?: string;
}) {
    const t = HR_TONES[tone];

    return (
        <div className={`relative min-w-[180px] max-w-xs flex-1 sm:w-56 sm:flex-none ${className}`}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className={`h-9 w-full rounded-xl border border-border/70 bg-background/70 pl-8 pr-7 text-xs shadow-sm backdrop-blur transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-4 ${t.focus}`} />
            {value && (
                <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                    <X className="size-3.5" />
                </button>
            )}
        </div>
    );
}

/* ───────────────────────── Товч ба select ───────────────────────── */

export function HrButton({ tone = 'emerald', icon: Icon, children, onClick, href, title, type = 'button' }: {
    tone?: HrTone;
    icon?: LucideIcon;
    children: ReactNode;
    onClick?: () => void;
    href?: string;
    title?: string;
    type?: 'button' | 'submit';
}) {
    const t = HR_TONES[tone];
    const cls = `group relative isolate flex h-9 items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-b px-3.5 text-xs font-semibold text-white shadow-lg ring-1 ring-inset ring-white/25 transition-all hover:-translate-y-px hover:shadow-xl hover:brightness-110 active:translate-y-0 active:scale-[0.97] ${t.btn}`;

    const inner = (
        <>
            <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {Icon && <Icon className="relative size-3.5 transition-transform duration-300 group-hover:rotate-90" />}
            <span className="relative">{children}</span>
        </>
    );

    return href
        ? <a href={href} title={title} className={cls}>{inner}</a>
        : <button type={type} onClick={onClick} title={title} className={cls}>{inner}</button>;
}

/** Толгойн баруун талд харагдах хоёрдогч товч (Excel татах гэх мэт). */
export function HrGhostButton({ icon: Icon, children, onClick, href, title }: {
    icon?: LucideIcon;
    children?: ReactNode;
    onClick?: () => void;
    href?: string;
    title?: string;
}) {
    const cls = 'flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-background/70 px-2.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-all hover:-translate-y-px hover:bg-muted hover:text-foreground active:translate-y-0 active:scale-[0.97]';

    // Дүрстэй үед нарийн дэлгэц дээр бичиг нуугдана, дүрсгүй бол үргэлж харагдана
    const inner = <>{Icon && <Icon className="size-3.5" />}{children && <span className={Icon ? 'hidden sm:inline' : ''}>{children}</span>}</>;

    return href
        ? <a href={href} title={title} className={cls}>{inner}</a>
        : <button onClick={onClick} title={title} className={cls}>{inner}</button>;
}

export function HrSelect({ value, onChange, children, tone = 'emerald', title }: {
    value: string;
    onChange: (v: string) => void;
    children: ReactNode;
    tone?: HrTone;
    title?: string;
}) {
    const t = HR_TONES[tone];

    return (
        <select value={value} onChange={e => onChange(e.target.value)} title={title}
            className={`h-8 rounded-lg border border-border/70 bg-background/70 px-2 text-xs text-foreground backdrop-blur focus:outline-none focus:ring-4 ${t.focus}`}>
            {children}
        </select>
    );
}

/** Шүүлтүүр цэвэрлэх дөрвөлжин товч. */
export function HrClearButton({ onClick }: { onClick: () => void }) {
    return (
        <button title="Шүүлтүүр цэвэрлэх" onClick={onClick}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.97]">
            <X className="size-3.5" />
        </button>
    );
}

/* ───────────────────────── Жагсаалтын хүрээ ───────────────────────── */

export function HrListCard({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-20px_rgba(0,0,0,0.25)] ${className}`}>
            {children}
        </div>
    );
}

/** Жагсаалтын баганын гарчиг — мөртэйгээ ижил grid ашиглана. */
export function HrListHead({ cols, children }: { cols: string; children: ReactNode }) {
    return (
        <div className={`hidden gap-x-3 rounded-t-2xl border-b border-border/60 bg-gradient-to-b from-muted/70 to-muted/25 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur lg:grid ${cols}`}>
            {children}
        </div>
    );
}

/** Мөрүүдийн хооронд зураас, эхний/сүүлийн мөрийн булан. */
export function HrListBody({ children }: { children: ReactNode }) {
    return (
        <div className="divide-y divide-border/50 [&>*:first-child]:rounded-t-[15px] [&>*:last-child]:rounded-b-[15px] lg:[&>*:first-child]:rounded-t-none">
            {children}
        </div>
    );
}

/**
 * Жагсаалтын нэг мөр — хулганаар дээгүүр очиход зүүн ирмэгийн өнгө гарч,
 * дараалан зөөлөн гарч ирнэ.
 */
export function HrRow({ cols, index = 0, accent, onClick, raised = false, className = '', children }: {
    cols: string;
    index?: number;
    /** Зүүн ирмэгийн өнгө (жишээ нь 'bg-emerald-500') */
    accent?: string;
    onClick?: () => void;
    /** Цэс нээлттэй мөр бусдаасаа дээр харагдана */
    raised?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
            onClick={onClick}
            className={`group relative grid animate-in items-center gap-x-3 gap-y-2 px-4 py-2.5 transition-colors duration-200 fade-in slide-in-from-bottom-1 fill-mode-backwards hover:bg-gradient-to-r hover:from-muted/70 hover:via-muted/40 hover:to-transparent ${
                onClick ? 'cursor-pointer' : ''} ${raised ? 'z-30' : ''} ${cols} ${className}`}>
            {accent && (
                <span aria-hidden className={`absolute inset-y-1.5 left-0 w-[3px] rounded-r-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${accent}`} />
            )}
            {children}
        </div>
    );
}

/* ───────────────────────── Хоосон төлөв ───────────────────────── */

export function HrEmpty({ icon: Icon, title, hint, action, tone = 'emerald' }: {
    icon: LucideIcon;
    title: string;
    hint?: string;
    action?: ReactNode;
    tone?: HrTone;
}) {
    const t = HR_TONES[tone];

    return (
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-card/40 px-6 py-14 text-center">
            <div aria-hidden
                style={{ backgroundColor: `rgb(${t.gridRgb} / 0.10)` }}
                className="pointer-events-none absolute left-1/2 top-8 size-40 -translate-x-1/2 rounded-full blur-3xl" />
            <span className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/40 ring-1 ring-inset ring-border">
                <Icon className="size-5 text-muted-foreground/70" />
            </span>
            <p className="relative mt-3 text-sm font-semibold text-foreground">{title}</p>
            {hint && <p className="relative mt-1 max-w-sm text-xs text-muted-foreground">{hint}</p>}
            {action && <div className="relative mt-4">{action}</div>}
        </div>
    );
}

/* ───────────────────────── Хуудаслалт ───────────────────────── */

export function PageBtn({ children, disabled, onClick }: { children: ReactNode; disabled: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} disabled={disabled}
            className="flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-background">
            {children}
        </button>
    );
}

/** Жагсаалтын хөл — зүүн талд тоо/дүн, баруун талд хуудас солих товчнууд. */
export function HrPager({ page, lastPage, from, to, total, unit = 'мөр', onPage, extra }: {
    page: number;
    lastPage: number;
    from: number | null;
    to: number | null;
    total: number;
    unit?: string;
    onPage: (page: number) => void;
    /** Зүүн талд нэмж харуулах мэдээлэл (нийт дүн гэх мэт) */
    extra?: ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-border/60 bg-gradient-to-b from-muted/10 to-muted/30 px-4 py-2">
            <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">{from ?? 0}–{to ?? 0}</span> / {total} {unit}
                {extra}
            </p>

            {lastPage > 1 && (
                <div className="flex items-center gap-1">
                    <PageBtn disabled={page === 1} onClick={() => onPage(page - 1)}>
                        <ChevronLeft className="size-3.5" />
                    </PageBtn>
                    <span className="px-2 text-[11px] font-medium tabular-nums text-muted-foreground">
                        {page} / {lastPage}
                    </span>
                    <PageBtn disabled={page === lastPage} onClick={() => onPage(page + 1)}>
                        <ChevronRight className="size-3.5" />
                    </PageBtn>
                </div>
            )}
        </div>
    );
}

/* ───────────────────────── Клиент талын хуудаслалт ───────────────────────── */

/**
 * Серверээс бүтэн жагсаалт ирдэг хуудсуудад зориулсан хуудаслалт.
 * HR-ийн бүх жагсаалт нэг хуудсанд 10 мөр харуулна.
 *
 *   const paged = usePaged(filtered);
 *   paged.data.map(...)
 *   <HrPager {...paged} onPage={paged.setPage} unit="хүсэлт" />
 */
export function usePaged<T>(items: T[], perPage = 10) {
    const [page, setPage] = useState(1);
    const lastPage = Math.max(1, Math.ceil(items.length / perPage));

    // Шүүлтүүр өөрчлөгдөж мөрийн тоо багасахад хоосон хуудсан дээр үлдэхгүй
    useEffect(() => {
        if (page > lastPage) setPage(1);
    }, [page, lastPage]);

    const current = Math.min(page, lastPage);
    const start = (current - 1) * perPage;

    return {
        page: current,
        setPage,
        lastPage,
        data: items.slice(start, start + perPage),
        from: items.length ? start + 1 : 0,
        to: Math.min(start + perPage, items.length),
        total: items.length,
    };
}
