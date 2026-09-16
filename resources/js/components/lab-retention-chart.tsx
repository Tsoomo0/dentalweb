import { Empty } from '@/components/lab-admin-ui';
import { cn } from '@/lib/utils';
import { Activity, Snowflake, TrendingDown } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

/**
 * Хичээлийн барих чадварын муруй (audience retention).
 *
 * ДҮРСЛЭЛИЙН БОДОЛ: энэ график ганц асуултад хариулна — "хүмүүс хаана
 * орхиж байна вэ". Тиймээс тоо биш, ХЭЛБЭР нь гол. Талбайг дүүргэж
 * дүрсэлсэн нь өндөр/намыг нүдээр шууд харуулна, уналтын цэгүүдийг улаан
 * босоо зураасаар тэмдэглэсэн нь "яг энд" гэдгийг заана.
 *
 * Видео, баримт хоёуланд ажиллана: хэвтээ тэнхлэг нь видеонд цаг ("4:30"),
 * баримтад хуудасны дугаар. Асуулт нь ижил, хэмжүүр нь өөр.
 *
 * Хулганаа хөдөлгөхөд тухайн цэгийн утга гарна — админ сэжигтэй хэсгээ
 * олоод, шууд тэр минут / тэр хуудас руу очиж шалгаж болно.
 */

export interface RetentionPoint {
    t: number;
    viewers: number;
    percent: number;
}

export interface RetentionData {
    available: boolean;
    /** seconds → видео (тэнхлэг нь цаг), page → баримт (тэнхлэг нь хуудас). */
    unit: 'seconds' | 'page';
    span: number;
    starters: number;
    bucket_seconds: number;
    points: RetentionPoint[];
    avg_percent: number;
    finish_percent: number;
    cliffs: { t: number; to: number; drop: number; percent: number }[];
    coldest: { t: number; percent: number } | null;
}

/** Секундыг "12:34" эсвэл "1:02:03" болгоно. */
export function clock(seconds: number): string {
    const s = Math.max(0, Math.round(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        : `${m}:${String(sec).padStart(2, '0')}`;
}

export default function LabRetentionChart({ data }: { data: RetentionData }) {
    const [hover, setHover] = useState<number | null>(null);
    const boxRef = useRef<HTMLDivElement>(null);

    const { points, cliffs } = data;
    const n = points.length;

    // Видеонд "4:30", баримтад "12-р хуудас" — нэг л газраас шийднэ
    const isPage = data.unit === 'page';
    const at     = (v: number) => (isPage ? `${Math.round(v)}-р хуудас` : clock(v));

    // Талбай ба шугамын зам — 100x100 хэмжээст, дараа нь сунгаж дүүргэнэ
    const { area, line } = useMemo(() => {
        if (n === 0) return { area: '', line: '' };

        const xy = points.map((p, i) => {
            const x = n === 1 ? 0 : (i / (n - 1)) * 100;

            return `${x.toFixed(3)},${(100 - p.percent).toFixed(3)}`;
        });

        return {
            line: `M${xy.join(' L')}`,
            area: `M0,100 L${xy.join(' L')} L100,100 Z`,
        };
    }, [points, n]);

    if (!data.available || n === 0) {
        return (
            <Empty
                title="Муруй зурах өгөгдөл алга"
                text="Ажилтнууд үзэж эхэлмэгц аль хэсэг нь барьж байгаа нь энд харагдана. YouTube хичээлийн урт тодорхойгүй, эсвэл баримтын хуудас тоологдоогүй бол муруй зурагдахгүй."
            />
        );
    }

    /** Хулганы байрлалаас хамгийн ойрын цэгийн индекс. */
    const track = (clientX: number) => {
        const box = boxRef.current?.getBoundingClientRect();
        if (!box || box.width === 0) return;

        const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
        setHover(Math.round(ratio * (n - 1)));
    };

    const active = hover !== null ? points[hover] : null;
    const activeX = hover !== null && n > 1 ? (hover / (n - 1)) * 100 : 0;

    return (
        <div className="px-3 py-3 sm:px-4">
            {/* ── Хураангуй үзүүлэлт ─────────────────────────────────────── */}
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <Metric
                    icon={Activity}
                    tone="text-violet-600 dark:text-violet-400"
                    value={`${data.avg_percent}%`}
                    label="дундаж барилт"
                    hint={`${data.starters} ажилтны үзэлтээр`}
                />
                <Metric
                    icon={TrendingDown}
                    tone={data.finish_percent < 50
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'}
                    value={`${data.finish_percent}%`}
                    label="эцэст нь хүрсэн"
                />
                {data.coldest && (
                    <Metric
                        icon={Snowflake}
                        tone="text-sky-600 dark:text-sky-400"
                        value={at(data.coldest.t)}
                        label={isPage ? 'хамгийн цөөн үзсэн хуудас' : 'хамгийн цөөн үзсэн агшин'}
                        hint={`${data.coldest.percent}%`}
                    />
                )}
            </div>

            {/* ── Муруй ──────────────────────────────────────────────────── */}
            <div
                ref={boxRef}
                onMouseMove={(e) => track(e.clientX)}
                onMouseLeave={() => setHover(null)}
                className="relative h-40 w-full cursor-crosshair overflow-hidden rounded-xl border bg-muted/20"
            >
                {/* Хэвтээ туслах шугамууд — 25% тутам */}
                {[25, 50, 75].map((p) => (
                    <span
                        key={p}
                        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/60"
                        style={{ top: `${100 - p}%` }}
                    />
                ))}

                {/*
                    Өнгийг SVG-ийн өөр дээр нь тавина. Gradient-ийн `currentColor`
                    нь <defs>-ийн ӨӨРИЙН өвлөсөн өнгийг уншдаг тул дотор нь <g>
                    дээр өнгө өгвөл талбай ягаан болохгүй, энгийн текстийн өнгө
                    болж хувирна.
                */}
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 size-full text-violet-500"
                >
                    <defs>
                        <linearGradient id="retention-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                        </linearGradient>
                    </defs>

                    <path d={area} fill="url(#retention-fill)" />
                    <path
                        d={line}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        /* Хэвтээ сунгалт шугамын зузааныг гажуудуулахаас сэргийлнэ */
                        vectorEffect="non-scaling-stroke"
                    />

                    {/* Уналтын цэгүүд */}
                    {cliffs.map((c) => {
                        const i = points.findIndex((p) => p.t === c.t);
                        if (i < 0 || n < 2) return null;

                        return (
                            <line
                                key={c.t}
                                x1={(i / (n - 1)) * 100}
                                x2={(i / (n - 1)) * 100}
                                y1={0}
                                y2={100}
                                className="text-rose-500/70"
                                stroke="currentColor"
                                strokeWidth={1}
                                strokeDasharray="3 3"
                                vectorEffect="non-scaling-stroke"
                            />
                        );
                    })}
                </svg>

                {/* Хулганы мөрдөгч */}
                {active && (
                    <>
                        <span
                            className="pointer-events-none absolute inset-y-0 w-px bg-foreground/40"
                            style={{ left: `${activeX}%` }}
                        />
                        <span
                            className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 ring-2 ring-background"
                            style={{ left: `${activeX}%`, top: `${100 - active.percent}%` }}
                        />
                        <span
                            className={cn(
                                'pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border bg-popover px-2 py-1',
                                'text-[11px] font-semibold shadow-md',
                            )}
                            style={{
                                left: `${Math.min(88, Math.max(12, activeX))}%`,
                            }}
                        >
                            <span className="tabular-nums">{at(active.t)}</span>
                            <span className="mx-1.5 text-muted-foreground/40">·</span>
                            <span className="tabular-nums text-violet-600 dark:text-violet-400">
                                {active.percent}%
                            </span>
                            <span className="ml-1 font-normal text-muted-foreground">
                                ({active.viewers} хүн)
                            </span>
                        </span>
                    </>
                )}
            </div>

            {/* ── Цагийн тэнхлэг ─────────────────────────────────────────── */}
            <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground/70">
                {[0, 0.25, 0.5, 0.75, 1].map((r) => (
                    <span key={r}>
                        {isPage
                            ? Math.max(1, Math.round(data.span * r))
                            : clock(data.span * r)}
                    </span>
                ))}
            </div>

            {/* ── Уналтын тайлбар ────────────────────────────────────────── */}
            {cliffs.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1.5 pr-1 text-[11px] font-semibold text-muted-foreground">
                        <TrendingDown className="size-3.5 text-rose-500" />
                        Хүмүүс энд орхиж байна
                    </span>
                    {cliffs.map((c) => (
                        <span
                            key={c.t}
                            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-rose-200/70 bg-rose-50/70 px-2.5 text-[11px] font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                            title={`${at(c.t)} – ${at(c.to)} хооронд үзэгч ${c.drop}%-иар цөөрсөн`}
                        >
                            <span className="tabular-nums">{at(c.t)}</span>
                            <span className="tabular-nums opacity-70">−{c.drop}%</span>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Графикийн дээрх нэг үзүүлэлт ──────────────────────────────────────── */
function Metric({ icon: Icon, tone, value, label, hint }: {
    icon: typeof Activity;
    tone: string;
    value: string;
    label: string;
    hint?: string;
}) {
    return (
        <span className="flex items-center gap-1.5">
            <Icon className={cn('size-3.5 shrink-0', tone)} />
            <span className={cn('text-[13px] font-bold tabular-nums', tone)}>{value}</span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
            {hint && <span className="text-[11px] text-muted-foreground/50">· {hint}</span>}
        </span>
    );
}
