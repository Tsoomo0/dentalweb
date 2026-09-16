import {
    AREA, BTN, CTA, Card, CallsHeader, Empty, Field, FilterBar, INPUT, IconBtn,
    InlineStat, LABEL, Pagination, Pill, SURFACE, Segmented, TABLE, TD, TH, THEAD, TR,
    TableWrap, type PageMeta,
} from '@/components/calls-ui';
import ReceptionLayout from '@/layouts/reception-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, Headphones, Moon, PhoneCall,
    PhoneMissed, Play, RotateCcw, Search, User, X,
} from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';

/* ── Types ─────────────────────────────────────────────── */
interface CallRow {
    id: number;
    number: string | null;
    caller_name: string | null;
    direction: 'inbound' | 'outbound';
    call_status: string | null;
    agent: string | null;
    user_name: string | null;
    started_at: string | null;
    waited_minutes: number | null;
    duration: number | null;
    talk_time: number | null;
    is_missed: boolean;
    is_after_hours: boolean;
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
type View = 'todo' | 'missed' | 'mine' | 'all';
interface Filters { view: View; from: string; to: string; search: string; per_page: number }
interface MyExtension {
    extension: string;
    label: string | null;
    branch_name: string | null;
    branch_mismatch: boolean;
}
interface Me { extensions: MyExtension[]; answered_today: number }
interface Stats {
    todo: number;
    today_total: number;
    today_missed: number;
    today_answer_rate: number | null;
}
interface Props {
    calls: Paginated<CallRow>;
    filters: Filters;
    resolutions: Record<string, string>;
    stats: Stats;
    branchName: string | null;
    me: Me;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Дуудлага', href: '/reception/calls' }];

const VIEWS: { key: View; label: string }[] = [
    { key: 'todo', label: 'Шийдвэрлэх' },
    { key: 'missed', label: 'Алдсан' },
    { key: 'mine', label: 'Миний' },
    { key: 'all', label: 'Бүгд' },
];

function fmtDuration(sec: number | null) {
    if (sec === null || sec === undefined) return '—';
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** Хүлээлгэсэн хугацаа — удах тусам яаралтай гэдэг нь өнгөөр мэдэгдэнэ. */
function waitTone(min: number | null) {
    if (min === null) return 'slate' as const;
    if (min >= 60) return 'red' as const;
    if (min >= 30) return 'amber' as const;
    return 'sky' as const;
}

function fmtWait(min: number) {
    if (min < 60) return `${min} мин`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}ц ${min % 60}м`;
    return `${Math.floor(h / 24)} хоног`;
}

export default function ReceptionCalls({ calls, filters, resolutions, stats, branchName, me }: Props) {
    const [form, setForm] = useState<Filters>(filters);
    const [resolving, setResolving] = useState<CallRow | null>(null);
    const [playing, setPlaying] = useState<number | null>(null);
    const [live, setLive] = useState<Stats>(stats);

    // Сервер талын тоо шинэчлэгдэхэд өөрийн хуулбарыг мөн шинэчилнэ
    useEffect(() => setLive(stats), [stats]);

    /**
     * Шинэ алдсан дуудлага ирсэн эсэхийг 30 секунд тутам шалгана.
     *
     * Мэдэгдэл (хонх, push) нь үндсэн суваг боловч ресепшн дэлгэцээ нээлттэй
     * орхидог тул энэ нь хоёр дахь баталгаа. Тоо өссөн үед л хуудсыг
     * шинэчилнэ — үгүй бол бичиж байсан тайлбар алга болно.
     */
    const todoRef = useRef(stats.todo);
    useEffect(() => { todoRef.current = live.todo; }, [live.todo]);

    useEffect(() => {
        const id = setInterval(async () => {
            try {
                const { data } = await axios.get<Stats>('/reception/calls/poll');
                setLive(data);

                if (data.todo > todoRef.current) {
                    router.reload({ only: ['calls', 'stats'] });
                }
            } catch { /* сүлжээ тасарсан — дараагийн оролдлогод засарна */ }
        }, 30_000);

        return () => clearInterval(id);
    }, []);

    function set<K extends keyof Filters>(key: K, value: Filters[K]) {
        const next = { ...form, [key]: value };
        setForm(next);
        router.get('/reception/calls', { ...next }, { preserveState: true, replace: true });
    }

    function applySearch(e: FormEvent) {
        e.preventDefault();
        router.get('/reception/calls', { ...form }, { preserveState: true, replace: true });
    }

    const isTodo = form.view === 'todo';

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Дуудлага" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <CallsHeader
                    icon={PhoneCall}
                    title="Дуудлага"
                    subtitle={branchName ? `${branchName} салбар` : 'Салбар тодорхойгүй'}
                >
                    <div className="grid grid-cols-2 divide-x divide-indigo-100/70 border-t border-indigo-100/70 sm:grid-cols-4 dark:divide-white/5 dark:border-white/5">
                        <InlineStat
                            label="Шийдвэрлэх"
                            value={live.todo}
                            tone={live.todo > 0 ? 'red' : 'emerald'}
                            title="Эргэж холбогдоогүй алдсан дуудлага"
                        />
                        <InlineStat label="Өнөөдөр нийт" value={live.today_total} />
                        <InlineStat
                            label="Өнөөдөр алдсан"
                            value={live.today_missed}
                            tone={live.today_missed > 0 ? 'amber' : 'slate'}
                        />
                        <InlineStat
                            label="Хариулалт"
                            value={live.today_answer_rate === null ? '—' : `${live.today_answer_rate}%`}
                            tone={live.today_answer_rate === null ? 'slate'
                                : live.today_answer_rate >= 90 ? 'emerald'
                                    : live.today_answer_rate >= 75 ? 'amber' : 'red'}
                        />
                    </div>
                </CallsHeader>

                <MyExtensionCard me={me} />

                {/* ── Шүүлтүүр ── */}
                <form onSubmit={applySearch}>
                    <FilterBar>
                        <div>
                            <label className={LABEL}>Харагдац</label>
                            <Segmented value={form.view} options={VIEWS} onChange={(v) => set('view', v)} />
                        </div>

                        {/* «Шийдвэрлэх» жагсаалт огноогоор хязгаарлагдахгүй —
                            хуучин барьж амжаагүй дуудлага далд үлдэх ёсгүй. */}
                        {!isTodo && (
                            <>
                                <div>
                                    <label className={LABEL}>Эхлэх</label>
                                    <input type="date" value={form.from} onChange={(e) => set('from', e.target.value)} className={INPUT} />
                                </div>
                                <div>
                                    <label className={LABEL}>Дуусах</label>
                                    <input type="date" value={form.to} onChange={(e) => set('to', e.target.value)} className={INPUT} />
                                </div>
                            </>
                        )}

                        <div className="min-w-52 flex-1">
                            <label className={LABEL}>Хайх</label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/50" />
                                <input
                                    value={form.search}
                                    onChange={(e) => setForm({ ...form, search: e.target.value })}
                                    placeholder="Дугаар эсвэл нэр"
                                    className={cn(INPUT, 'pl-9')}
                                />
                            </div>
                        </div>
                        <button type="submit" className={CTA}>Хайх</button>
                    </FilterBar>
                </form>

                {/* ── Жагсаалт ── */}
                <Card>
                    <TableWrap>
                        <table className={TABLE}>
                            <thead className={THEAD}>
                                <tr>
                                    <th className={TH}>Дугаар</th>
                                    <th className={TH}>Огноо</th>
                                    {isTodo && <th className={TH}>Хүлээсэн</th>}
                                    <th className={TH}>Төлөв</th>
                                    <th className={TH} />
                                </tr>
                            </thead>
                            <tbody>
                                {calls.data.length === 0 && (
                                    <tr>
                                        <td colSpan={isTodo ? 6 : 5}>
                                            {isTodo ? (
                                                <Empty
                                                    icon={CheckCircle2}
                                                    title="Бүх дуудлага шийдэгдсэн"
                                                    hint="Эргэж холбогдох хүн алга. Шинэ алдсан дуудлага ирвэл энд гарч ирнэ."
                                                />
                                            ) : (
                                                <Empty icon={PhoneCall} title="Дуудлага олдсонгүй" hint="Огноо эсвэл хайлтаа өөрчилж үзнэ үү." />
                                            )}
                                        </td>
                                    </tr>
                                )}

                                {calls.data.map((c) => (
                                    <tr key={c.id} className={TR}>
                                        <td className={cn(TD, 'align-top')}>
                                            <div className="flex items-center gap-1.5 font-semibold">
                                                {c.direction === 'inbound'
                                                    ? <ArrowDownLeft className="size-3.5 shrink-0 text-emerald-600" />
                                                    : <ArrowUpRight className="size-3.5 shrink-0 text-sky-600" />}
                                                {c.number ?? '—'}
                                            </div>
                                            {c.caller_name && (
                                                <div className="text-[11px] text-muted-foreground">{c.caller_name}</div>
                                            )}
                                        </td>

                                        <td className={cn(TD, 'align-top whitespace-nowrap text-muted-foreground')}>
                                            {c.started_at ?? '—'}
                                            {!c.is_missed && (
                                                <div className="text-[11px]">яриа {fmtDuration(c.talk_time ?? c.duration)}</div>
                                            )}
                                        </td>

                                        {isTodo && (
                                            <td className={cn(TD, 'align-top')}>
                                                {c.waited_minutes !== null && (
                                                    <Pill tone={waitTone(c.waited_minutes)} icon={Clock}>
                                                        {fmtWait(c.waited_minutes)}
                                                    </Pill>
                                                )}
                                            </td>
                                        )}

                                        <td className={cn(TD, 'align-top')}>
                                            {c.is_missed ? (
                                                c.handled_at ? (
                                                    <div>
                                                        <Pill tone="emerald" icon={CheckCircle2}>{c.resolution_label}</Pill>
                                                        <div className="mt-1 text-[11px] text-muted-foreground">
                                                            {c.handled_by_name} · {c.handled_at}
                                                        </div>
                                                        {c.resolution_note && (
                                                            <div className="mt-0.5 max-w-64 text-[11px] text-muted-foreground italic">
                                                                “{c.resolution_note}”
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Pill tone="red" icon={PhoneMissed}>Алдсан</Pill>
                                                )
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground">{c.call_status ?? '—'}</span>
                                            )}
                                            {c.is_after_hours && (
                                                <div className="mt-1">
                                                    <Pill icon={Moon}>Цагаас гадуур</Pill>
                                                </div>
                                            )}
                                        </td>

                                        <td className={cn(TD, 'align-top')}>
                                            <div className="flex justify-end gap-1">
                                                {c.has_recording && (
                                                    <IconBtn
                                                        icon={Play}
                                                        title="Яриа сонсох"
                                                        onClick={() => setPlaying(playing === c.id ? null : c.id)}
                                                    />
                                                )}
                                                {c.is_missed && (
                                                    c.handled_at ? (
                                                        <IconBtn
                                                            icon={RotateCcw}
                                                            title="Тэмдэглэл буцаах"
                                                            onClick={() => router.patch(`/reception/calls/${c.id}/unresolve`, {}, { preserveScroll: true })}
                                                        />
                                                    ) : (
                                                        <button onClick={() => setResolving(c)} className={CTA}>
                                                            Тэмдэглэх
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                            {playing === c.id && (
                                                <audio controls autoPlay src={`/calls/${c.id}/recording`} className="mt-2 h-9 w-64" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableWrap>
                </Card>

                <Pagination meta={calls} onPerPage={(n) => set('per_page', n)} />
            </div>

            {resolving && (
                <ResolveDialog call={resolving} resolutions={resolutions} onClose={() => setResolving(null)} />
            )}
        </ReceptionLayout>
    );
}

/* ── Миний дотуур дугаар ───────────────────────────────── */
function MyExtensionCard({ me }: { me: Me }) {
    // Дугаар холбогдоогүй бол шалтгааныг нь хэлнэ — ажилтан «Миний» жагсаалт
    // хоосон байгааг өөрийн буруу гэж бодох ёсгүй.
    if (me.extensions.length === 0) {
        return (
            <div className={cn(SURFACE, 'flex items-center gap-3 border-amber-300/70 p-3.5 dark:border-amber-500/25')}>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400">
                    <Headphones className="size-4" />
                </span>
                <div className="min-w-0 text-sm">
                    <p className="font-semibold">Танд дотуур дугаар холбогдоогүй байна</p>
                    <p className="text-xs text-muted-foreground">
                        Админ таны хэрэглэгчийг дотуур дугаартай холбосны дараа «Миний» хэсэгт
                        өөрийн хариулсан дуудлага харагдана.
                    </p>
                </div>
            </div>
        );
    }

    const mismatch = me.extensions.some((e) => e.branch_mismatch);

    return (
        <div className={cn(SURFACE, 'flex flex-wrap items-center gap-x-5 gap-y-3 p-3.5')}>
            <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-sm shadow-indigo-500/25">
                    <Headphones className="size-4" />
                </span>
                <div>
                    <p className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        Миний дотуур дугаар
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {me.extensions.map((e) => (
                            <span
                                key={e.extension}
                                className="rounded-lg bg-indigo-500/12 px-2.5 py-1 font-mono text-base font-bold tracking-tight text-indigo-700 tabular-nums dark:text-indigo-300"
                                title={e.label ?? undefined}
                            >
                                {e.extension}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="h-9 w-px bg-gray-200 dark:bg-white/10" />

            <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                    Өнөөдөр хариулсан
                </p>
                <p className="mt-0.5 text-base font-bold tabular-nums">{me.answered_today}</p>
            </div>

            {mismatch && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                    Таны дугаар өөр салбарт бүртгэгдсэн байна — хариулсан дуудлага энэ
                    жагсаалтад орж ирэхгүй. Админд хандана уу.
                </p>
            )}
        </div>
    );
}

/* ── Шийдвэрлэсэн тэмдэглэл ────────────────────────────── */
function ResolveDialog({ call, resolutions, onClose }: {
    call: CallRow; resolutions: Record<string, string>; onClose: () => void;
}) {
    const form = useForm({ resolution: '', resolution_note: '' });

    function submit(e: FormEvent) {
        e.preventDefault();
        form.patch(`/reception/calls/${call.id}/resolve`, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-gray-200/80 px-4 py-3 dark:border-white/10">
                    <div className="min-w-0">
                        <h3 className="truncate font-semibold">Алдсан дуудлага тэмдэглэх</h3>
                        <p className="truncate text-xs text-muted-foreground">
                            {call.number} · {call.started_at}
                        </p>
                    </div>
                    <IconBtn icon={X} title="Хаах" onClick={onClose} />
                </div>

                <form onSubmit={submit} className="space-y-4 p-4">
                    <div>
                        <label className={LABEL}>Юу болсон бэ?</label>
                        <div className="space-y-1.5">
                            {Object.entries(resolutions).map(([key, label]) => (
                                <label
                                    key={key}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition',
                                        form.data.resolution === key
                                            ? 'border-indigo-400 bg-indigo-500/5'
                                            : 'border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.03]',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="resolution"
                                        value={key}
                                        checked={form.data.resolution === key}
                                        onChange={(e) => form.setData('resolution', e.target.value)}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                        {form.errors.resolution && (
                            <p className="mt-1 text-[11px] font-medium text-red-600">{form.errors.resolution}</p>
                        )}
                    </div>

                    <Field label="Тайлбар" error={form.errors.resolution_note}>
                        <textarea
                            rows={3}
                            value={form.data.resolution_note}
                            onChange={(e) => form.setData('resolution_note', e.target.value)}
                            placeholder="Жишээ: Маргааш 14:00 цагт ирэхээр боллоо."
                            className={AREA}
                        />
                    </Field>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className={BTN}>Болих</button>
                        <button
                            type="submit"
                            disabled={form.processing || !form.data.resolution}
                            className={CTA}
                        >
                            Хадгалах
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
