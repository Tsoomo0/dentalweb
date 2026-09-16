import {
    AREA, BTN, CTA, CTA_LG, Card, CallsHeader, Empty, FilterBar, INPUT, IconBtn, InlineStat,
    LABEL, Pagination, Pill, TABLE, TD, TH, THEAD, TR, TableWrap, TONE, type PageMeta,
} from '@/components/calls-ui';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowDownLeft, ArrowUpRight, Ban, CheckCircle2, ListChecks, Moon, Pause, PhoneMissed,
    PhoneOff, Play, RotateCcw, Search, User, X,
} from 'lucide-react';
import { Fragment, FormEvent, useState } from 'react';

/* ── Types ─────────────────────────────────────────────── */
interface CallRow {
    id: number;
    number: string | null;
    caller_name: string | null;
    direction: 'inbound' | 'outbound';
    call_status: string | null;
    queue_name: string | null;
    agent: string | null;
    branch_name: string | null;
    user_name: string | null;
    started_at: string | null;
    duration: number | null;
    talk_time: number | null;
    hold_time: number | null;
    business_number: string | null;
    is_missed: boolean;
    is_after_hours: boolean;
    is_spam: boolean;
    handled_at: string | null;
    handled_by_name: string | null;
    resolution: string | null;
    resolution_label: string | null;
    resolution_note: string | null;
    has_recording: boolean;
}
interface Paginated<T> extends PageMeta {
    data: T[];
}
interface Filters {
    from: string; to: string; branch_id: string | null; direction: string | null;
    status: string | null; search: string; agent: string | null; per_page: number;
}
interface Stats {
    total: number; missed: number; unhandled: number;
    answer_rate: number | null; avg_duration: number | null;
}
interface Props {
    calls: Paginated<CallRow>;
    filters: Filters;
    branches: { id: number; name: string }[];
    resolutions: Record<string, string>;
    stats: Stats;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Дуудлага', href: '/admin/calls' }];

const STATUSES = [
    { value: '', label: 'Бүгд' },
    { value: 'missed', label: 'Алдсан' },
    { value: 'unhandled', label: 'Шийдэгдээгүй' },
    { value: 'answered', label: 'Хариулсан' },
    { value: 'after_hours', label: 'Ажлын цагаас гадуур' },
    { value: 'spam', label: 'Спам' },
];

function fmtDuration(sec: number | null) {
    if (sec === null || sec === undefined) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AdminCallsIndex({ calls, filters, branches, resolutions, stats }: Props) {
    const [form, setForm] = useState<Filters>(filters);
    const [resolving, setResolving] = useState<CallRow | null>(null);
    const [playing, setPlaying] = useState<number | null>(null);

    function applyFilters(e?: FormEvent) {
        e?.preventDefault();
        router.get('/admin/calls', { ...form }, { preserveState: true, replace: true });
    }

    /** Дугаарыг спам жагсаалтад нэмнэ — тухайн дугаарын БҮХ дуудлагад нөлөөлнө. */
    function blockNumber(c: CallRow) {
        if (confirm(`${c.number}-ийг спам болгох уу?\n\nЭнэ дугаарын бүх дуудлага спам болж, цаашид мэдэгдэл өгөхгүй. Дараа нь буцаах боломжтой.`)) {
            router.post(`/admin/calls/${c.id}/block`, {}, { preserveScroll: true });
        }
    }

    function set<K extends keyof Filters>(key: K, value: Filters[K]) {
        const next = { ...form, [key]: value };
        setForm(next);
        router.get('/admin/calls', { ...next }, { preserveState: true, replace: true });
    }

    const answerTone = stats.answer_rate === null ? 'slate'
        : stats.answer_rate >= 90 ? 'emerald'
            : stats.answer_rate >= 75 ? 'amber' : 'red';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Дуудлагын бүртгэл" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <CallsHeader
                    icon={ListChecks}
                    title="Дуудлагын бүртгэл"
                    subtitle={`${calls.total.toLocaleString()} бичлэг · ${form.from} — ${form.to}`}
                    current="index"
                >
                    <div className="grid grid-cols-2 divide-x divide-indigo-100/70 border-t border-indigo-100/70 sm:grid-cols-4 dark:divide-white/5 dark:border-white/5">
                        <InlineStat label="Нийт дуудлага" value={stats.total.toLocaleString()} />
                        <InlineStat label="Алдсан" value={stats.missed} tone={stats.missed > 0 ? 'red' : 'slate'} />
                        <InlineStat label="Шийдэгдээгүй" value={stats.unhandled} tone={stats.unhandled > 0 ? 'amber' : 'slate'} />
                        <InlineStat
                            label="Хариулалт"
                            value={stats.answer_rate === null ? '—' : `${stats.answer_rate}%`}
                            tone={answerTone}
                        />
                    </div>
                </CallsHeader>

                {/* ── Шүүлтүүр ──────────────────────────────────────── */}
                <form onSubmit={applyFilters}>
                    <FilterBar>
                        <div>
                            <label className={LABEL}>Эхлэх</label>
                            <input type="date" value={form.from} onChange={(e) => set('from', e.target.value)} className={INPUT} />
                        </div>
                        <div>
                            <label className={LABEL}>Дуусах</label>
                            <input type="date" value={form.to} onChange={(e) => set('to', e.target.value)} className={INPUT} />
                        </div>
                        <div className="min-w-36">
                            <label className={LABEL}>Салбар</label>
                            <select value={form.branch_id ?? ''} onChange={(e) => set('branch_id', e.target.value || null)} className={INPUT}>
                                <option value="">Бүгд</option>
                                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="min-w-40">
                            <label className={LABEL}>Төлөв</label>
                            <select value={form.status ?? ''} onChange={(e) => set('status', e.target.value || null)} className={INPUT}>
                                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        <div className="min-w-28">
                            <label className={LABEL}>Чиглэл</label>
                            <select value={form.direction ?? ''} onChange={(e) => set('direction', e.target.value || null)} className={INPUT}>
                                <option value="">Бүгд</option>
                                <option value="inbound">Ирсэн</option>
                                <option value="outbound">Явсан</option>
                            </select>
                        </div>
                        <div className="min-w-52 flex-1">
                            <label className={LABEL}>Хайх</label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={form.search}
                                    onChange={(e) => setForm({ ...form, search: e.target.value })}
                                    placeholder="Дугаар эсвэл нэр"
                                    className={cn(INPUT, 'pl-9')}
                                />
                            </div>
                        </div>
                        <button type="submit" className={CTA_LG}>Шүүх</button>
                    </FilterBar>
                </form>

                {/* ── Хүснэгт ───────────────────────────────────────── */}
                <Card>
                    {calls.data.length === 0 ? (
                        <Empty
                            icon={PhoneOff}
                            title="Энэ хугацаанд дуудлага алга."
                            hint="Огнооны хязгаар эсвэл шүүлтүүрээ өөрчилж үзнэ үү."
                        />
                    ) : (
                        <TableWrap>
                            <table className={TABLE}>
                                <thead className={THEAD}>
                                    <tr>
                                        <th className={TH}>Огноо</th>
                                        <th className={TH}>Дугаар</th>
                                                <th className={TH}>Салбар</th>
                                        <th className={TH}>Хариулсан</th>
                                        <th className={cn(TH, 'text-right')}>Яриа</th>
                                        <th className={TH}>Төлөв</th>
                                        <th className={cn(TH, 'text-right')}>Үйлдэл</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {calls.data.map((c) => (
                                        <Fragment key={c.id}>
                                            <tr className={cn(TR, 'align-top', playing === c.id && 'bg-indigo-500/[0.05]')}>
                                                <td className={cn(TD, 'whitespace-nowrap text-xs text-muted-foreground tabular-nums')}>
                                                    {c.started_at ?? '—'}
                                                </td>

                                                <td className={TD}>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn(
                                                            'grid size-5 shrink-0 place-items-center rounded',
                                                            c.direction === 'inbound' ? TONE.emerald.tile : TONE.sky.tile,
                                                        )}>
                                                            {c.direction === 'inbound'
                                                                ? <ArrowDownLeft className="size-3" />
                                                                : <ArrowUpRight className="size-3" />}
                                                        </span>
                                                        <span className="font-mono text-[13px] font-semibold">{c.number ?? '—'}</span>
                                                    </div>
                                                    {c.caller_name && (
                                                        <div className="mt-0.5 pl-6.5 text-xs text-muted-foreground">{c.caller_name}</div>
                                                    )}
                                                </td>

                                                <td className={TD}>
                                                    {c.branch_name ?? <Pill tone="amber">тодорхойгүй</Pill>}
                                                    {c.queue_name && (
                                                        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{c.queue_name}</div>
                                                    )}
                                                </td>

                                                <td className={TD}>
                                                    {c.user_name
                                                        ?? (c.agent
                                                            ? <span className="font-mono text-xs">{c.agent}</span>
                                                            : <span className="text-muted-foreground">—</span>)}
                                                </td>

                                                <td className={cn(TD, 'text-right whitespace-nowrap tabular-nums')}>
                                                    <span className="font-semibold">{fmtDuration(c.talk_time ?? c.duration)}</span>
                                                    {/* Нийт хугацаа нь хонх, хүлээлтийг агуулдаг тул
                                                        ярианаас өөр бол хоёуланг харуулна. */}
                                                    {c.talk_time !== null && c.duration !== null && c.talk_time !== c.duration && (
                                                        <div className="text-[11px] text-muted-foreground">
                                                            нийт {fmtDuration(c.duration)}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className={TD}>
                                                    {c.is_missed ? (
                                                        c.handled_at ? (
                                                            <div>
                                                                <Pill tone="emerald" icon={CheckCircle2}>{c.resolution_label}</Pill>
                                                                <div className="mt-1 text-[11px] text-muted-foreground">
                                                                    {c.handled_by_name} · {c.handled_at}
                                                                </div>
                                                                {c.resolution_note && (
                                                                    <div className="mt-0.5 max-w-64 border-l-2 border-emerald-500/30 pl-2 text-[11px] italic text-muted-foreground">
                                                                        {c.resolution_note}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <Pill tone="red" icon={PhoneMissed}>Алдсан</Pill>
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">{c.call_status ?? '—'}</span>
                                                    )}

                                                    {/* Нэмэлт нөхцөл — яагаад мэдэгдэл ирээгүйг тайлбарлана */}
                                                    {(c.is_spam || c.is_after_hours) && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {c.is_spam && <Pill icon={Ban}>Спам</Pill>}
                                                            {c.is_after_hours && <Pill icon={Moon}>Цагаас гадуур</Pill>}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className={TD}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        {c.has_recording && (
                                                            <IconBtn
                                                                icon={playing === c.id ? Pause : Play}
                                                                title="Яриа сонсох"
                                                                onClick={() => setPlaying(playing === c.id ? null : c.id)}
                                                            />
                                                        )}
                                                        {c.is_missed && (
                                                            c.handled_at ? (
                                                                <IconBtn
                                                                    icon={RotateCcw}
                                                                    title="Тэмдэглэл буцаах"
                                                                    onClick={() => router.patch(`/admin/calls/${c.id}/unresolve`, {}, { preserveScroll: true })}
                                                                />
                                                            ) : (
                                                                <button onClick={() => setResolving(c)} className={CTA}>
                                                                    Тэмдэглэх
                                                                </button>
                                                            )
                                                        )}
                                                        {!c.is_spam && (
                                                            <IconBtn icon={Ban} title="Спам болгох" tone="red" onClick={() => blockNumber(c)} />
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {playing === c.id && (
                                                <tr className="border-b border-gray-100 bg-indigo-500/[0.05] dark:border-white/5">
                                                    <td colSpan={8} className="px-3 py-2.5">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                                                Бичлэг · {c.number}
                                                            </span>
                                                            <audio controls autoPlay src={`/calls/${c.id}/recording`} className="h-9 max-w-md flex-1" />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </TableWrap>
                    )}
                </Card>

                <Pagination meta={calls} onPerPage={(n) => set('per_page', n)} />
            </div>

            {resolving && (
                <ResolveDialog call={resolving} resolutions={resolutions} onClose={() => setResolving(null)} />
            )}
        </AppLayout>
    );
}

/* ── Шийдвэрлэсэн тэмдэглэл ────────────────────────────── */
function ResolveDialog({ call, resolutions, onClose }: {
    call: CallRow; resolutions: Record<string, string>; onClose: () => void;
}) {
    const form = useForm({ resolution: '', resolution_note: '' });

    function submit(e: FormEvent) {
        e.preventDefault();
        form.patch(`/admin/calls/${call.id}/resolve`, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-gray-200/80 bg-gradient-to-r from-indigo-50 to-sky-50/60 px-5 py-3.5 dark:border-white/10 dark:from-indigo-950/40 dark:to-sky-950/20">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-sm">
                            <PhoneMissed className="size-4" />
                        </span>
                        <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold tracking-tight">Алдсан дуудлага тэмдэглэх</h3>
                            <p className="truncate text-xs text-muted-foreground">
                                {call.number} · {call.started_at}
                            </p>
                        </div>
                    </div>
                    <IconBtn icon={X} title="Хаах" onClick={onClose} />
                </div>

                <form onSubmit={submit} className="space-y-4 p-5">
                    <div>
                        <label className={LABEL}>Юу болсон бэ?</label>
                        <div className="space-y-1.5">
                            {Object.entries(resolutions).map(([key, label]) => {
                                const active = form.data.resolution === key;

                                return (
                                    <label
                                        key={key}
                                        className={cn(
                                            'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition',
                                            active
                                                ? 'border-indigo-400 bg-indigo-500/8 font-semibold ring-2 ring-indigo-500/15'
                                                : 'border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.04]',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="resolution"
                                            value={key}
                                            checked={active}
                                            onChange={(e) => form.setData('resolution', e.target.value)}
                                            className="accent-indigo-600"
                                        />
                                        {label}
                                    </label>
                                );
                            })}
                        </div>
                        {form.errors.resolution && <p className="mt-1 text-xs font-medium text-red-600">{form.errors.resolution}</p>}
                    </div>

                    <div>
                        <label className={LABEL}>Тайлбар</label>
                        <textarea
                            rows={3}
                            value={form.data.resolution_note}
                            onChange={(e) => form.setData('resolution_note', e.target.value)}
                            placeholder="Жишээ: Маргааш 14:00 цагт ирэхээр боллоо."
                            className={AREA}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className={BTN}>Болих</button>
                        <button type="submit" disabled={form.processing || !form.data.resolution} className={CTA}>
                            <CheckCircle2 className="size-3.5" /> Хадгалах
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
