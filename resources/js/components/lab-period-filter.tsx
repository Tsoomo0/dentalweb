import { router } from '@inertiajs/react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface PeriodFilters {
    year: number | null;
    quarter: number | null;
    month: number | null;
    /** Ажлын төрлийн шүүлт — хугацаа солиход хадгалагдана */
    work?: string | null;
}

const QUARTERS = [
    { value: 1, label: 'I улирал (1-3 сар)' },
    { value: 2, label: 'II улирал (4-6 сар)' },
    { value: 3, label: 'III улирал (7-9 сар)' },
    { value: 4, label: 'IV улирал (10-12 сар)' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}-р сар` }));

/** Сонгосон хугацааг хүн уншихаар бичих */
export function periodLabel(f: PeriodFilters): string {
    if (!f.year) return 'Бүх хугацаа';
    if (f.month) return `${f.year} оны ${f.month}-р сар`;
    if (f.quarter) return `${f.year} оны ${QUARTERS.find(q => q.value === f.quarter)?.label ?? ''}`;
    return `${f.year} он`;
}

/**
 * Жил → улирал → сар давхар сонголт.
 * Сар сонгоход түүнийг агуулах улирал сервер талд автоматаар тохирно.
 */
export function LabPeriodFilter({ url, filters, years }: {
    url: string;
    filters: PeriodFilters;
    years: number[];
}) {
    function go(patch: Partial<PeriodFilters>) {
        const next = { ...filters, ...patch };
        // Жил цэвэрлэвэл доод түвшин утгагүй болно
        if (!next.year) { next.quarter = null; next.month = null; }
        router.get(url, {
            year:    next.year    ?? undefined,
            quarter: next.quarter ?? undefined,
            month:   next.month   ?? undefined,
            work:    filters.work ?? undefined,   // ажлын шүүлт хэвээр үлдэнэ
        }, { preserveState: false, preserveScroll: true });
    }

    const hasFilter = filters.year !== null;

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Select
                label="Жил"
                value={filters.year}
                display={filters.year ? `${filters.year} он` : 'Бүх хугацаа'}
                options={years.map(y => ({ value: y, label: `${y} он` }))}
                allLabel="Бүх хугацаа"
                onChange={v => go({ year: v })}
            />
            <Select
                label="Улирал"
                value={filters.quarter}
                display={filters.quarter ? `${filters.quarter}-р улирал` : 'Бүх улирал'}
                options={QUARTERS}
                allLabel="Бүх улирал"
                disabled={!filters.year}
                onChange={v => go({ quarter: v, month: null })}
            />
            <Select
                label="Сар"
                value={filters.month}
                display={filters.month ? `${filters.month}-р сар` : 'Бүх сар'}
                options={filters.quarter
                    ? MONTHS.filter(m => Math.ceil(m.value / 3) === filters.quarter)
                    : MONTHS}
                allLabel="Бүх сар"
                disabled={!filters.year}
                onChange={v => go({ month: v })}
            />

            {hasFilter && (
                <button onClick={() => go({ year: null })}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
                    <X className="size-3" /> Цэвэрлэх
                </button>
            )}
        </div>
    );
}

/** Ажлын төрлөөр шүүх — жагсаалт болон ажилтны хуудсанд хамтдаа ашиглана */
export function LabWorkFilter({ value, options, onChange }: {
    value: string | null;
    options: { value: string; count: number }[];
    onChange: (v: string | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const active = !!value;

    useEffect(() => {
        if (!open) return;
        function onDown(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    useEffect(() => { if (!open) setQ(''); }, [open]);

    const shown = q.trim()
        ? options.filter(o => o.value.toLowerCase().includes(q.trim().toLowerCase()))
        : options;

    function pick(v: string | null) { onChange(v); setOpen(false); }

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors ${
                    active
                        ? 'border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-400'
                        : 'border-gray-200 dark:border-gray-700 bg-background text-muted-foreground hover:bg-muted'
                }`}>
                <span className="font-semibold">Ажил</span>
                <span className={`max-w-36 truncate font-medium ${active ? '' : 'text-foreground'}`}>
                    {value ?? 'Бүх ажил'}
                </span>
                <ChevronDown className={`size-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-full z-40 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                    {options.length > 8 && (
                        <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
                            <Search className="size-3 text-muted-foreground" />
                            <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)}
                                placeholder="Шүүх..."
                                className="w-full bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none" />
                        </div>
                    )}
                    <div className="max-h-64 overflow-y-auto py-1">
                        <Item selected={!value} onClick={() => pick(null)} label="Бүх ажил" />
                        {shown.map(o => (
                            <Item key={o.value} selected={value === o.value}
                                onClick={() => pick(o.value)} label={o.value} count={o.count} />
                        ))}
                        {shown.length === 0 && (
                            <p className="px-3 py-3 text-center text-[11px] text-muted-foreground">Олдсонгүй</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Theme-той тохирсон өөрийн цэс (native select dark theme-д уншигдахгүй) ── */
function Select({ label, value, display, options, allLabel, disabled, onChange }: {
    label: string;
    value: number | null;
    display: string;
    options: { value: number; label: string }[];
    allLabel: string;
    disabled?: boolean;
    onChange: (v: number | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const active = value !== null;

    useEffect(() => {
        if (!open) return;
        function onDown(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    function pick(v: number | null) { onChange(v); setOpen(false); }

    return (
        <div ref={ref} className="relative">
            <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    active
                        ? 'border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-400'
                        : 'border-gray-200 dark:border-gray-700 bg-background text-muted-foreground hover:bg-muted'
                }`}>
                <span className="font-semibold">{label}</span>
                <span className={`max-w-32 truncate font-medium ${active ? '' : 'text-foreground'}`}>{display}</span>
                <ChevronDown className={`size-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && !disabled && (
                <div className="absolute left-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                    <div className="max-h-64 overflow-y-auto py-1">
                        <Item selected={value === null} onClick={() => pick(null)} label={allLabel} />
                        {options.map(o => (
                            <Item key={o.value} selected={value === o.value}
                                onClick={() => pick(o.value)} label={o.label} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function Item({ label, count, selected, onClick }: {
    label: string; count?: number; selected: boolean; onClick: () => void;
}) {
    return (
        <button type="button" onClick={onClick}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors ${
                selected
                    ? 'bg-violet-50 font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                    : 'text-foreground hover:bg-muted'
            }`}>
            <Check className={`size-3 shrink-0 ${selected ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
            <span className="flex-1 truncate">{label}</span>
            {count !== undefined && (
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums text-muted-foreground">
                    {count}
                </span>
            )}
        </button>
    );
}
