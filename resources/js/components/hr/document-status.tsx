import { Ban, CheckCircle2, Clock, PenLine, XCircle, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface StatusStyle {
    label: string;
    icon: LucideIcon;
    /** Шошгоны өнгө */
    pill: string;
    /** Цэгийн өнгө */
    dot: string;
    /** Мөрийн зүүн ирмэгийн өнгө */
    accent: string;
}

/**
 * Гэрээний төлөв бүрийн харагдац — жагсаалт, шүүлтүүр, дэлгэрэнгүй
 * хаана ч ижилхэн байхын тулд нэг газраас тодорхойлно.
 */
export const STATUS: Record<string, StatusStyle> = {
    draft: {
        label: 'Гэрээ үүссэн',
        icon: PenLine,
        pill: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:ring-slate-700',
        dot: 'bg-slate-400',
        accent: 'bg-slate-300 dark:bg-slate-600',
    },
    pending_employer: {
        label: 'Захирлыг хүлээж буй',
        icon: Clock,
        pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
        dot: 'bg-amber-500',
        accent: 'bg-amber-400',
    },
    pending_employee: {
        label: 'Ажилтныг хүлээж буй',
        icon: Clock,
        pill: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60',
        dot: 'bg-blue-500',
        accent: 'bg-blue-400',
    },
    completed: {
        label: 'Баталгаажсан',
        icon: CheckCircle2,
        pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
        dot: 'bg-emerald-500',
        accent: 'bg-emerald-500',
    },
    declined: {
        label: 'Татгалзсан',
        icon: XCircle,
        pill: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60',
        dot: 'bg-red-500',
        accent: 'bg-red-500',
    },
    cancelled: {
        label: 'Цуцлагдсан',
        icon: Ban,
        pill: 'bg-zinc-100 text-zinc-500 ring-zinc-200 dark:bg-zinc-800/70 dark:text-zinc-400 dark:ring-zinc-700',
        dot: 'bg-zinc-400',
        accent: 'bg-zinc-300 dark:bg-zinc-600',
    },
};

export function statusOf(key: string): StatusStyle {
    return STATUS[key] ?? STATUS.draft;
}

/** Төлвийн шошго. */
export function StatusPill({ status, className = '' }: { status: string; className?: string }) {
    const s = statusOf(status);

    return (
        <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ring-1 ring-inset ${s.pill} ${className}`}>
            <span className={`size-1.5 shrink-0 rounded-full ${s.dot}`} />
            <span className="truncate">{s.label}</span>
        </span>
    );
}

/**
 * Гарын үсгийн явц — захирал → ажилтан гэсэн хоёр алхмыг нэг харцаар
 * ойлгуулна.
 */
export function SignProgress({ employerAt, employeeAt, status }: {
    employerAt: string | null;
    employeeAt: string | null;
    status: string;
}) {
    // Татгалзсан нь улаан, цуцлагдсан нь зүгээр саарал — хоёр өөр утга
    const failed = status === 'declined';

    const Step = ({ done, label, at }: { done: boolean; label: string; at: string | null }) => (
        <span className="inline-flex items-center gap-1" title={at ? `${label}: ${at}` : `${label} — хүлээгдэж буй`}>
            <span className={`flex size-3 shrink-0 items-center justify-center rounded-full ${
                done ? 'bg-emerald-500' : failed ? 'bg-red-400' : 'bg-muted-foreground/25'
            }`}>
                {done && <CheckCircle2 className="size-2.5 text-white" strokeWidth={3.5} />}
            </span>
            <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
        </span>
    );

    return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] leading-tight">
            <Step done={!!employerAt} at={employerAt} label="Захирал" />
            <span className={`h-px w-2.5 ${employeeAt ? 'bg-emerald-400' : 'bg-muted-foreground/25'}`} />
            <Step done={!!employeeAt} at={employeeAt} label="Ажилтан" />
        </span>
    );
}

/** Ажилтны товч дүрс — нэрний эхний үсгүүд. */
export function Avatar({ name, className = '' }: { name: string | null; className?: string }) {
    const initials = (name ?? '?')
        .replace(/[^\p{L}\s.]/gu, '')
        .split(/[\s.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase() || '?';

    // Нэрээс тогтмол өнгө сонгож, ажилтан бүр өөрийн өнгөтэй болно
    const palette = [
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
        'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
        'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
        'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
        'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
        'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
    ];
    let hash = 0;
    for (const ch of name ?? '') hash = (hash + ch.charCodeAt(0)) % palette.length;

    return (
        <span className={`flex shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${palette[hash]} ${className}`}>
            {initials}
        </span>
    );
}

/** Хуудасны гоёл — хөвөгч туяа, торон бүтэц. Хөдөлгөөнийг хязгаарласан хэрэглэгчид зогсоно. */
export const HR_PANEL_FX = `
@keyframes hrDriftA { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(20px,-14px,0) scale(1.12); } }
@keyframes hrDriftB { 0%,100% { transform: translate3d(0,0,0) scale(1.06); } 50% { transform: translate3d(-24px,12px,0) scale(0.94); } }
.hr-drift { animation: hrDriftA 16s ease-in-out infinite; }
.hr-drift-2 { animation: hrDriftB 21s ease-in-out infinite; }
.hr-grid {
    color: rgb(16 185 129 / 0.16);
    background-image: radial-gradient(currentColor 1px, transparent 1px);
    background-size: 18px 18px;
    -webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 85%);
    mask-image: linear-gradient(to bottom, #000 0%, transparent 85%);
}
.dark .hr-grid { color: rgb(52 211 153 / 0.12); }
@media (prefers-reduced-motion: reduce) {
    .hr-drift, .hr-drift-2 { animation: none; }
}
`;

/** Баталгаажилтын хувь — нэг харцаар мэдрэгдэх жижиг цагираг. */
export function CompletionRing({ value, total, label = 'Баталгаажилт', title }: {
    value: number; total: number; label?: string; title?: string;
}) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const radius = 15.5;
    const circumference = 2 * Math.PI * radius;

    // Ачаалагдахад 0-ээс дүүрч, амьд мэдрэмж өгнө
    const [shown, setShown] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => setShown(pct), 80);

        return () => clearTimeout(t);
    }, [pct]);

    return (
        <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-2.5 py-1 shadow-sm backdrop-blur lg:flex"
            title={title ?? `Нийт ${total} гэрээнээс ${value} нь баталгаажсан`}>
            <span className="relative flex size-9 items-center justify-center">
                <svg viewBox="0 0 40 40" className="size-9 -rotate-90">
                    <defs>
                        <linearGradient id="hr-ring-grad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="#0d9488" />
                        </linearGradient>
                    </defs>
                    <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="4" className="stroke-muted-foreground/15" />
                    <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="4" strokeLinecap="round"
                        stroke="url(#hr-ring-grad)"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - (circumference * shown) / 100}
                        className="transition-[stroke-dashoffset] duration-1000 ease-out" />
                </svg>
                <span className="absolute text-[9px] font-bold tabular-nums text-foreground">{pct}%</span>
            </span>
            <span className="pr-0.5 text-[10px] leading-tight text-muted-foreground">
                {label}
                <span className="block font-semibold tabular-nums text-foreground">{value} / {total}</span>
            </span>
        </div>
    );
}

/** Уншиж танилцах → гарын үсэг гэсэн хоёр алхмын заагч. */
export function StepBadge({ step, labels }: { step: 'read' | 'sign'; labels: [string, string] | string[] }) {
    return (
        <div className="hidden shrink-0 items-center gap-1.5 md:flex">
            {labels.map((label, i) => {
                const active = (step === 'read' ? 0 : 1) === i;
                const done = (step === 'read' ? 0 : 1) > i;

                return (
                    <div key={label} className="flex items-center gap-1.5">
                        {i > 0 && <span className="h-px w-4 bg-border" />}
                        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            active ? 'bg-emerald-600 text-white'
                                : done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    : 'bg-muted text-muted-foreground'}`}>
                            {done ? <CheckCircle2 className="size-3" /> : <span className="text-[10px]">{i + 1}</span>}
                            {label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
