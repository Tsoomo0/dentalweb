import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtMins } from './shared';

/**
 * Ажилтны ирцийн тайлангийн графикууд (лабын ажилтны тайлангийн загвартай нэг хэв маяг).
 *
 * Өнгө нь dataviz палитраас (validate_palette.js-ээр гэрэл/харанхуй хоёр горимд шалгасан):
 * төлөвийн дараалал цагтаа → хоцорсон → хуваарьгүй → чөлөө → ирээгүй нь хөрш өнгөнүүдийг
 * өнгөний харалган хүнд ч ялгагдахаар байрлуулсан — дарааллыг бүү соль.
 */

/** Өнгөний токенууд — графикийн эх элемент дээр тавина (харанхуй горимд өөрийн алхам). */
export const VIZ_TOKENS = [
    '[--att-blue:#2a78d6] dark:[--att-blue:#3987e5]',
    '[--att-orange:#eb6834] dark:[--att-orange:#d95926]',
    '[--att-aqua:#1baf7a] dark:[--att-aqua:#199e70]',
    '[--att-violet:#4a3aa7] dark:[--att-violet:#9085e9]',
    '[--att-red:#e34948] dark:[--att-red:#e66767]',
    '[--att-plan:#b4b3ad] dark:[--att-plan:#5f5e5a]',
    '[--att-plan-bg:#e6e5df] dark:[--att-plan-bg:#2f2f2c]',
    '[--att-grid:#ecebe6] dark:[--att-grid:#262624]',
    '[--att-axis:#898781]',
].join(' ');

export type StatusKey = 'on_time' | 'late' | 'unscheduled' | 'leave' | 'absent';

export const STATUS_SERIES: { key: StatusKey; label: string; color: string }[] = [
    { key: 'on_time', label: 'Цагтаа', color: 'var(--att-blue)' },
    { key: 'late', label: 'Хоцорсон', color: 'var(--att-orange)' },
    { key: 'unscheduled', label: 'Хуваарьгүй ажилласан', color: 'var(--att-aqua)' },
    { key: 'leave', label: 'Чөлөө', color: 'var(--att-violet)' },
    { key: 'absent', label: 'Ирээгүй', color: 'var(--att-red)' },
];

const AXIS = { fontSize: 9, fill: 'var(--att-axis)' };
const MARGIN = { top: 6, right: 4, bottom: 0, left: 0 };

/** Жижиг (4 багана) картанд багтах баганын өргөн */
const barWidth = (n: number, min = 3, max = 12) => Math.max(min, Math.min(max, Math.floor(200 / Math.max(1, n)) - 2));

/* ───────────────────────── Нийтлэг хэсгүүд ───────────────────────── */

export function ChartCard({ title, icon: Icon, legend, children, className = '' }: {
    title: string; icon?: LucideIcon; legend?: ReactNode; children: ReactNode; className?: string;
}) {
    return (
        <section className={`overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm ${className}`}>
            <header className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-border/60 px-3 py-1.5">
                <h2 className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                    {Icon && <Icon className="size-3 text-sky-500" />}{title}
                </h2>
                {legend && <div className="ml-auto flex flex-wrap items-center gap-x-2 gap-y-0.5">{legend}</div>}
            </header>
            <div className="px-2.5 py-2">{children}</div>
        </section>
    );
}

/** Тайлбарын түлхүүр — дүрс нь графикийн тэмдэгтэй ижил (шугам эсвэл дөрвөлжин). */
export function LegendKey({ color, label, line }: { color: string; label: string; line?: boolean }) {
    return (
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <span className={line ? 'h-0.5 w-3 rounded-full' : 'size-2 rounded-[2px]'} style={{ background: color }} />{label}
        </span>
    );
}

/** Tooltip — утга тод, нэр нь хоёрдогч; мөр бүрт графикийн өнгөний богино зураас. */
function TipBox({ title, rows, note }: { title: string; rows: { color: string; value: string; label: string }[]; note?: string }) {
    return (
        <div className="min-w-[150px] rounded-[10px] border border-border bg-card px-3 py-2 text-[11px] shadow-[0_4px_16px_rgb(0_0_0/0.12)]">
            <p className="mb-1 font-bold text-foreground">{title}</p>
            {rows.map(r => (
                <p key={r.label} className="flex items-center gap-1.5 leading-5">
                    <span className="h-0.5 w-3 rounded-full" style={{ background: r.color }} />
                    <span className="font-bold tabular-nums text-foreground">{r.value}</span>
                    <span className="text-muted-foreground">{r.label}</span>
                </p>
            ))}
            {note && <p className="mt-1 border-t border-border/60 pt-1 text-[10px] text-muted-foreground">{note}</p>}
        </div>
    );
}

const Empty = ({ height }: { height: number }) => (
    <p className="flex items-center justify-center text-[11px] text-muted-foreground" style={{ height }}>Өгөгдөл алга</p>
);

interface ShapeProps { x?: number; y?: number; width?: number; height?: number }

/** Өгөгдлийн төгсгөл талдаа 4px бөөрөнхий, суурь талдаа шулуун багана. */
function barPath({ x = 0, y = 0, width = 0, height = 0 }: ShapeProps, roundBottom: boolean) {
    const top = Math.min(y, y + height);
    const h = Math.abs(height);
    const r = Math.min(4, h, width / 2);
    if (!h || !width) return '';
    return roundBottom
        ? `M${x},${top} h${width} v${h - r} a${r},${r} 0 0 1 -${r},${r} h-${width - 2 * r} a${r},${r} 0 0 1 -${r},-${r} Z`
        : `M${x},${top + h} v-${h - r} a${r},${r} 0 0 1 ${r},-${r} h${width - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} Z`;
}

const pick = (data: { key: string }[], onPick?: (key: string) => void) =>
    (s: { activeTooltipIndex?: number | string | null } | null) => {
        const i = s?.activeTooltipIndex;
        if (onPick && i != null && data[Number(i)]) onPick(data[Number(i)].key);
    };

/* ───────────────────────── Ажилласан ба төлөвлөсөн цаг ───────────────────────── */

export interface HoursDatum {
    key: string; label: string; title: string;
    worked: number | null; planned: number | null; workedMin: number; plannedMin: number;
}

/**
 * Ажилласан ба төлөвлөсөн цаг (хоёулаа цаг тул нэг тэнхлэг).
 *   bar  — өдөр бүрээр: төлөвлөсөн (цайвар саарал) дээр ажилласан (цэнхэр) давхцана — саарал
 *          үлдсэн нь дутуу, цэнхэр давсан нь илүү цаг. Өдрүүд салангид тул муруй биш багана.
 *   area — сар бүрээр: ажилласан нь градиенттэй талбай, төлөвлөсөн нь саарал шугам.
 */
export function HoursChart({ data, variant, onPick, height = 150 }: {
    data: HoursDatum[]; variant: 'bar' | 'area'; onPick?: (key: string) => void; height?: number;
}) {
    if (!data.some(d => d.workedMin || d.plannedMin)) return <Empty height={height} />;

    const tooltip = (
        <Tooltip cursor={variant === 'bar' ? { fill: 'var(--att-grid)', opacity: 0.7 } : { stroke: 'var(--att-axis)', strokeWidth: 1, strokeOpacity: 0.5 }}
            content={({ active, payload }) => {
                const d = active ? (payload?.[0]?.payload as HoursDatum | undefined) : undefined;
                if (!d || d.worked === null) return null;
                const diff = d.workedMin - d.plannedMin;
                return (
                    <TipBox title={d.title} rows={[
                        { color: 'var(--att-blue)', value: fmtMins(d.workedMin) ?? '0', label: 'ажилласан' },
                        { color: 'var(--att-plan)', value: fmtMins(d.plannedMin) ?? '0', label: 'төлөвлөсөн' },
                    ]} note={d.plannedMin ? (diff >= 0 ? `+${fmtMins(diff) ?? '0'} илүү` : `${fmtMins(-diff)} дутуу`) : undefined} />
                );
            }} />
    );
    const yAxis = <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}ц`} allowDecimals={false} width={26} />;
    const grid = <CartesianGrid vertical={false} stroke="var(--att-grid)" />;

    if (variant === 'bar') {
        const barSize = barWidth(data.length);
        return (
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={MARGIN} barSize={barSize} barGap={-barSize} onClick={pick(data, onPick)} className={onPick ? 'cursor-pointer' : undefined}>
                        <defs>
                            <linearGradient id="attWorkedBar" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--att-blue)" stopOpacity={1} />
                                <stop offset="100%" stopColor="var(--att-blue)" stopOpacity={0.75} />
                            </linearGradient>
                        </defs>
                        {grid}
                        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} dy={4} interval="preserveStartEnd" minTickGap={8} />
                        {yAxis}
                        {tooltip}
                        <Bar dataKey="planned" fill="var(--att-plan-bg)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        <Bar dataKey="worked" fill="url(#attWorkedBar)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={MARGIN} onClick={pick(data, onPick)} className={onPick ? 'cursor-pointer' : undefined}>
                    <defs>
                        <linearGradient id="attWorked" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--att-blue)" stopOpacity={0.24} />
                            <stop offset="100%" stopColor="var(--att-blue)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    {grid}
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} dy={4} />
                    {yAxis}
                    {tooltip}
                    <Line type="monotone" dataKey="planned" stroke="var(--att-plan)" strokeWidth={1.5} dot={false} activeDot={false} isAnimationActive={false} />
                    <Area type="monotone" dataKey="worked" stroke="var(--att-blue)" strokeWidth={2} fill="url(#attWorked)" isAnimationActive={false}
                        dot={{ r: 3, strokeWidth: 2, stroke: 'var(--card)', fill: 'var(--att-blue)' }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--card)', fill: 'var(--att-blue)' }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ───────────────────────── Өдрийн бүтэц (donut) ───────────────────────── */

export function StatusDonut({ counts, center, centerLabel }: { counts: Record<StatusKey, number>; center: string; centerLabel: string }) {
    const total = STATUS_SERIES.reduce((a, s) => a + counts[s.key], 0);
    const data = STATUS_SERIES.filter(s => counts[s.key]).map(s => ({ ...s, value: counts[s.key] }));

    return (
        <div>
            <div className="relative h-[92px]">
                {total ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="label" innerRadius={30} outerRadius={43} paddingAngle={data.length > 1 ? 3 : 0}
                                cornerRadius={4} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>
                                {data.map(d => <Cell key={d.key} fill={d.color} />)}
                            </Pie>
                            <Tooltip content={({ active, payload }) => {
                                const d = active ? (payload?.[0]?.payload as (typeof data)[number] | undefined) : undefined;
                                if (!d) return null;
                                return <TipBox title={d.label} rows={[{ color: d.color, value: `${d.value} өдөр`, label: `${Math.round((d.value / total) * 100)}%` }]} />;
                            }} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="mx-auto mt-[3px] size-[86px] rounded-full border-[13px] border-muted" />
                )}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-extrabold leading-none text-foreground">{center}</span>
                    <span className="mt-0.5 text-[8px] text-muted-foreground">{centerLabel}</span>
                </div>
            </div>
            <ul className="mt-1.5 space-y-px">
                {STATUS_SERIES.map(s => (
                    <li key={s.key} className={`flex items-center gap-1.5 text-[10px] leading-4 ${counts[s.key] ? '' : 'opacity-40'}`}>
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                        <span className="truncate text-muted-foreground">{s.label}</span>
                        <span className="ml-auto font-semibold tabular-nums text-foreground">{counts[s.key]}</span>
                        <span className="w-8 text-right tabular-nums text-muted-foreground">{total ? Math.round((counts[s.key] / total) * 100) : 0}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ───────────────────────── Ирсэн цаг: хуваарийн эхлэлтэй зөрүү ───────────────────────── */

export interface ArrivalDatum {
    key: string; label: string; title: string;
    /** ирсэн − хуваарийн эхлэл (минут): сөрөг = эрт, эерэг = хоцорсон */
    diff: number | null; checkedIn: string | null; start: string | null;
}

/**
 * Хоёр туйлт багана: тэгээс доош = эрт ирсэн (цэнхэр), дээш = хоцорсон (улбар шар).
 * Хүлцлийн доторх хоцролт цагтаад тооцогдоно (AttendanceEvaluator-тэй адил).
 */
export function ArrivalChart({ data, grace, onPick, height = 150 }: { data: ArrivalDatum[]; grace: number; onPick?: (key: string) => void; height?: number }) {
    if (!data.some(d => d.diff !== null)) return <Empty height={height} />;
    const barSize = barWidth(data.length);
    const isLate = (d: ArrivalDatum) => (d.diff ?? 0) > grace;

    const shape = (p: unknown) => {
        const props = p as ShapeProps & { payload?: ArrivalDatum };
        const d = props.payload;
        if (!d || d.diff === null) return <g />;
        return <path d={barPath(props, d.diff < 0)} fill={isLate(d) ? 'var(--att-orange)' : 'var(--att-blue)'} />;
    };

    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={MARGIN} barSize={barSize} onClick={pick(data, onPick)} className={onPick ? 'cursor-pointer' : undefined}>
                    <CartesianGrid vertical={false} stroke="var(--att-grid)" />
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} dy={4} interval="preserveStartEnd" minTickGap={8} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} width={30} allowDecimals={false}
                        tickFormatter={(v: number) => (v > 0 ? `+${v}м` : `${v}м`)} />
                    <ReferenceLine y={0} stroke="var(--att-axis)" strokeOpacity={0.6} />
                    {grace > 0 && <ReferenceLine y={grace} stroke="var(--att-orange)" strokeOpacity={0.35} />}
                    <Tooltip cursor={{ fill: 'var(--att-grid)', opacity: 0.7 }}
                        content={({ active, payload }) => {
                            const d = active ? (payload?.[0]?.payload as ArrivalDatum | undefined) : undefined;
                            if (!d || d.diff === null) return null;
                            const late = isLate(d);
                            return (
                                <TipBox title={d.title} note={`хуваарь ${d.start}`} rows={[{
                                    color: late ? 'var(--att-orange)' : 'var(--att-blue)',
                                    value: d.checkedIn ?? '',
                                    label: d.diff > 0 ? `${fmtMins(d.diff)} ${late ? 'хоцорсон' : 'хүлцэл дотор'}` : d.diff < 0 ? `${fmtMins(-d.diff)} эрт` : 'яг цагтаа',
                                }]} />
                            );
                        }} />
                    <Bar dataKey="diff" shape={shape} isAnimationActive={false} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ───────────────────────── Сар бүрийн өдрийн бүтэц ───────────────────────── */

export type StatusDatum = { key: string; label: string; title: string } & Record<StatusKey, number>;

/** Сар бүрийн өдрүүдийг төлөвөөр давхарласан багана; хэрчмүүдийн хооронд 2px зай. */
export function StatusStackChart({ data, onPick, height = 150 }: { data: StatusDatum[]; onPick?: (key: string) => void; height?: number }) {
    if (!data.some(d => STATUS_SERIES.some(s => d[s.key]))) return <Empty height={height} />;
    const barSize = barWidth(data.length, 6, 16);

    // Зөвхөн хамгийн дээд (тэг биш) хэрчим бөөрөнхий оройтой
    const shapeFor = (k: StatusKey, color: string) => (p: unknown) => {
        const props = p as ShapeProps & { payload?: StatusDatum };
        const d = props.payload;
        if (!d || !d[k]) return <g />;
        const keys = STATUS_SERIES.map(s => s.key);
        const isTop = keys.slice(keys.indexOf(k) + 1).every(x => !d[x]);
        const { x = 0, y = 0, width = 0, height: h = 0 } = props;
        return isTop
            ? <path d={barPath(props, false)} fill={color} stroke="var(--card)" strokeWidth={2} />
            : <rect x={x} y={Math.min(y, y + h)} width={width} height={Math.abs(h)} fill={color} stroke="var(--card)" strokeWidth={2} />;
    };

    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={MARGIN} barSize={barSize} onClick={pick(data, onPick)} className={onPick ? 'cursor-pointer' : undefined}>
                    <CartesianGrid vertical={false} stroke="var(--att-grid)" />
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} dy={4} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={18} />
                    <Tooltip cursor={{ fill: 'var(--att-grid)', opacity: 0.7 }}
                        content={({ active, payload }) => {
                            const d = active ? (payload?.[0]?.payload as StatusDatum | undefined) : undefined;
                            if (!d) return null;
                            const rows = STATUS_SERIES.filter(s => d[s.key]).map(s => ({ color: s.color, value: `${d[s.key]} өдөр`, label: s.label.toLowerCase() }));
                            return <TipBox title={d.title} rows={rows.length ? rows : [{ color: 'var(--att-plan)', value: '—', label: 'бүртгэл алга' }]} note={onPick ? 'Дарж сарын тайланг харах' : undefined} />;
                        }} />
                    {STATUS_SERIES.map(s => (
                        <Bar key={s.key} dataKey={s.key} stackId="days" fill={s.color} shape={shapeFor(s.key, s.color)} isAnimationActive={false} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ───────────────────────── Дундаж үзүүлэлтүүд ───────────────────────── */

export function InsightRow({ icon: Icon, tone, label, value, sub }: { icon: LucideIcon; tone: string; label: string; value: string; sub?: string }) {
    return (
        <div className="flex items-center gap-2 py-[5px]">
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${tone}`}><Icon className="size-3" /></span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] text-muted-foreground">{label}</p>
                {sub && <p className="truncate text-[9px] text-muted-foreground/70">{sub}</p>}
            </div>
            <span className="text-xs font-bold tabular-nums text-foreground">{value}</span>
        </div>
    );
}
