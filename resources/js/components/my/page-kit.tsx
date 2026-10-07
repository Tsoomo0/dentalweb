import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

/**
 * Ажилтны порталын (my/*) компьютерийн загварын НЭГДСЭН багц.
 *
 * HR/админ талын ирцийн хуудастай ижил хэв маяг: улаан өнгөөр будсан нягт толгой
 * + нимгэн үзүүлэлтийн мөр, гарчигтай картууд, таб, төлөвийн шошго, хүснэгт.
 * Утасны загвар хуудас бүрт тусдаа хэвээр (md:hidden), энэ нь зөвхөн md+.
 *
 *   <MyDesktop>
 *     <MyHeader icon={CalendarDays} title="Чөлөөний хүсэлт" subtitle="Б.Болд · Эмч"
 *               actions={<button className={myBtn.primary}>…</button>}
 *               stats={[<MyStat label="Нийт" value={3} />, …]} />
 *     <MyCard title="Хүсэлтийн түүх" icon={History}>…</MyCard>
 *   </MyDesktop>
 */

export function MyDesktop({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`hidden space-y-3 p-4 md:block xl:px-5 print:hidden ${className}`}>{children}</div>;
}

export function MyHeader({ icon: Icon, photo, title, badge, subtitle, actions, tabs, stats }: {
    icon: LucideIcon;
    /** Байвал дүрсний оронд ажилтны зураг */
    photo?: { url: string | null; initials: string };
    title: ReactNode;
    badge?: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
    /** Толгойн доорх мөр: таб, шүүлтүүр гэх мэт */
    tabs?: ReactNode;
    stats?: ReactNode[];
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-red-200/60 bg-gradient-to-br from-red-50/80 via-card to-rose-50/60 shadow-sm dark:border-red-900/40 dark:from-red-950/30 dark:via-card dark:to-rose-950/20">
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                {photo ? (
                    <span className="size-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-sm ring-2 ring-card">
                        {photo.url ? <img src={photo.url} alt="" className="size-full object-cover object-top" />
                            : <span className="flex size-full items-center justify-center text-xs font-bold text-white">{photo.initials}</span>}
                    </span>
                ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-sm shadow-red-600/20">
                        <Icon className="size-5" />
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <h1 className="flex items-center gap-2 truncate text-base font-bold text-foreground">{title}{badge}</h1>
                    {subtitle && <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">{subtitle}</div>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            {tabs && <div className="flex flex-wrap items-center gap-2 border-t border-red-100/80 px-4 py-2 dark:border-white/10">{tabs}</div>}
            {stats && stats.length > 0 && (
                <div className="grid divide-x divide-red-100/80 border-t border-red-100/80 dark:divide-white/10 dark:border-white/10"
                    style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
                    {stats}
                </div>
            )}
        </section>
    );
}

export type MyAccent = 'red' | 'rose' | 'sky' | 'blue' | 'emerald' | 'amber' | 'orange' | 'violet' | 'indigo' | 'slate';

const ACCENT: Record<MyAccent, string> = {
    red: 'text-red-700 dark:text-red-400',
    rose: 'text-rose-600 dark:text-rose-400',
    sky: 'text-sky-700 dark:text-sky-400',
    blue: 'text-blue-700 dark:text-blue-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-400',
    orange: 'text-orange-600 dark:text-orange-400',
    violet: 'text-violet-700 dark:text-violet-400',
    indigo: 'text-indigo-700 dark:text-indigo-400',
    slate: 'text-foreground',
};

export function MyStat({ label, value, sub, accent = 'slate', title }: {
    label: string; value: ReactNode; sub?: ReactNode; accent?: MyAccent; title?: string;
}) {
    return (
        <div className="min-w-0 px-2 py-1.5 text-center" title={title}>
            <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="truncate text-sm font-bold leading-tight">
                <span className={ACCENT[accent]}>{value}</span>
                {sub && <span className="ml-1 text-[10px] font-medium text-muted-foreground">{sub}</span>}
            </p>
        </div>
    );
}

export function MyCard({ title, icon: Icon, count, actions, children, className = '', bodyClassName = 'p-3' }: {
    title?: ReactNode; icon?: LucideIcon; count?: number; actions?: ReactNode;
    children: ReactNode; className?: string; bodyClassName?: string;
}) {
    return (
        <section className={`overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm ${className}`}>
            {(title || actions) && (
                <header className="flex min-h-10 flex-wrap items-center gap-1.5 border-b border-border/60 bg-muted/30 px-3 py-1.5">
                    {Icon && <Icon className="size-3.5 text-red-500" />}
                    {title && <h2 className="text-xs font-bold text-foreground">{title}</h2>}
                    {count !== undefined && <span className="rounded-md bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{count}</span>}
                    {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
                </header>
            )}
            <div className={bodyClassName}>{children}</div>
        </section>
    );
}

export function MyEmpty({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center px-4 py-10 text-center">
            <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500"><Icon className="size-5" /></span>
            <p className="text-xs font-semibold text-foreground">{title}</p>
            {hint && <p className="mt-0.5 max-w-sm text-[11px] text-muted-foreground">{hint}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

export function MyTabs<K extends string>({ tabs, value, onChange }: {
    tabs: { key: K; label: string; count?: number; icon?: LucideIcon }[];
    value: K; onChange: (k: K) => void;
}) {
    return (
        <div className="flex h-7 items-center rounded-lg bg-white/80 p-0.5 shadow-sm ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10">
            {tabs.map(t => {
                const active = t.key === value;
                return (
                    <button key={t.key} type="button" onClick={() => onChange(t.key)}
                        className={`flex h-full items-center gap-1 rounded-md px-2.5 text-[11px] font-semibold transition ${active ? 'bg-red-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}>
                        {t.icon && <t.icon className="size-3.5" />}{t.label}
                        {t.count !== undefined && <span className={`rounded px-1 text-[10px] tabular-nums ${active ? 'bg-white/20' : 'bg-muted'}`}>{t.count}</span>}
                    </button>
                );
            })}
        </div>
    );
}

export type MyTone = 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate' | 'red' | 'blue';

const TONE: Record<MyTone, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
    rose: 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300',
    red: 'bg-red-600 text-white ring-red-600',
    sky: 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300',
    blue: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300',
    violet: 'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300',
    slate: 'bg-muted text-muted-foreground ring-border',
};

export function MyPill({ tone, icon: Icon, children, title }: { tone: MyTone; icon?: LucideIcon; children: ReactNode; title?: string }) {
    return (
        <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONE[tone]}`}>
            {Icon && <Icon className="size-3" />}{children}
        </span>
    );
}

/** Түлхүүр — утга мөр (хувийн мэдээлэл гэх мэт) */
export function MyField({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
            <span className="min-w-0 truncate text-right text-xs font-semibold text-foreground">{value || <span className="text-muted-foreground/50">—</span>}</span>
        </div>
    );
}

export const myBtn = {
    primary: 'inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-b from-red-500 to-red-600 px-3 text-xs font-semibold text-white shadow-sm shadow-red-600/20 ring-1 ring-inset ring-white/20 transition hover:brightness-110 disabled:opacity-50',
    ghost: 'inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/80 px-2.5 text-xs font-medium text-muted-foreground shadow-sm ring-1 ring-black/5 transition hover:text-foreground dark:bg-white/[0.06] dark:ring-white/10',
    subtle: 'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground',
    danger: 'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-500/10',
};

export const myTable = {
    table: 'w-full text-xs',
    thead: 'text-[10px] uppercase tracking-wider text-muted-foreground',
    th: 'px-3 py-1.5 text-left font-semibold',
    tbody: 'divide-y divide-border/40',
    tr: 'transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]',
    td: 'px-3 py-2',
};

export const myInput = 'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20';
