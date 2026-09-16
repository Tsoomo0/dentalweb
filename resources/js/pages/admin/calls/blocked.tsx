import {
    BTN, CTA, Card, CardHead, CardNote, CallsHeader, Empty, Field, INPUT, IconBtn,
    SURFACE, TABLE, TD, TH, THEAD, TR, TableWrap,
} from '@/components/calls-ui';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Ban, Check, Lightbulb, Plus, ShieldBan, ShieldOff, Trash2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

/* ── Types ─────────────────────────────────────────────── */
interface Blocked {
    id: number;
    number_norm: string;
    label: string | null;
    reason: string | null;
    created_by_name: string | null;
    created_at: string | null;
    call_count: number;
    last_call: string | null;
}
interface Suggestion {
    number_norm: string;
    total: number;
    avg_talk: number;
    last_call: string | null;
}
interface Props { blocked: Blocked[]; suggestions: Suggestion[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Дуудлага', href: '/admin/calls' },
    { title: 'Спам дугаар', href: '/admin/calls/blocked' },
];

export default function BlockedNumbers({ blocked, suggestions }: Props) {
    const [showAdd, setShowAdd] = useState(false);
    const form = useForm({ number: '', label: '', reason: '' });

    function submit(e: FormEvent) {
        e.preventDefault();
        form.post('/admin/calls/blocked', {
            preserveScroll: true,
            onSuccess: () => { form.reset(); setShowAdd(false); },
        });
    }

    function remove(b: Blocked) {
        if (confirm(`${b.number_norm}-ийг жагсаалтаас хасах уу?\n\nЭнэ дугаарын ${b.call_count} дуудлагын спам тэмдэг арилж, тайланд дахин орно.`)) {
            router.delete(`/admin/calls/blocked/${b.id}`, { preserveScroll: true });
        }
    }

    function addSuggestion(number: string) {
        setShowAdd(true);
        form.setData({ number, label: '', reason: 'Богино хугацаанд олон удаа залгасан' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const totalBlockedCalls = blocked.reduce((a, b) => a + b.call_count, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Спам дугаар" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <CallsHeader
                    icon={ShieldBan}
                    title="Спам дугаар"
                    subtitle={`${blocked.length} дугаар · ${totalBlockedCalls.toLocaleString()} дуудлага шүүгдсэн`}
                    current="blocked"
                    actions={
                        !showAdd && (
                            <button onClick={() => setShowAdd(true)} className={CTA}>
                                <Plus className="size-3.5" /> Дугаар нэмэх
                            </button>
                        )
                    }
                />

                <div className={cn(SURFACE, 'flex gap-3 p-4')}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gray-500/10 text-muted-foreground">
                        <ShieldOff className="size-4" />
                    </span>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Энд байгаа дугаараас ирсэн дуудлага <span className="font-semibold text-foreground">бүртгэгдсэн хэвээр</span> байх
                        боловч мэдэгдэл өгөхгүй, SLA сэрэмжлүүлэг ажиллуулахгүй, хариулалтын хувийг
                        гажуудуулахгүй. Дуудлага устгагдахгүй тул буруу тэмдэглэсэн бол хасахад бүх
                        тоо сэргэнэ.
                    </p>
                </div>

                {showAdd && (
                    <Card className="border-indigo-300/60 dark:border-indigo-500/25">
                        <CardHead
                            icon={Plus}
                            title="Шинэ спам дугаар"
                            actions={<IconBtn icon={X} title="Хаах" onClick={() => { setShowAdd(false); form.reset(); }} />}
                        />
                        <form onSubmit={submit} className="grid gap-3 p-4 md:grid-cols-4">
                            <Field label="Дугаар" error={form.errors.number}>
                                <input
                                    autoFocus
                                    value={form.data.number}
                                    onChange={(e) => form.setData('number', e.target.value)}
                                    placeholder="99112233"
                                    className={cn(INPUT, 'font-mono')}
                                />
                            </Field>
                            <Field label="Нэр" error={form.errors.label}>
                                <input
                                    value={form.data.label}
                                    onChange={(e) => form.setData('label', e.target.value)}
                                    placeholder="Даатгалын зар"
                                    className={INPUT}
                                />
                            </Field>
                            <Field label="Шалтгаан" error={form.errors.reason}>
                                <input
                                    value={form.data.reason}
                                    onChange={(e) => form.setData('reason', e.target.value)}
                                    placeholder="Яагаад спам вэ?"
                                    className={INPUT}
                                />
                            </Field>
                            <div className="flex items-end gap-2">
                                <button type="submit" disabled={form.processing} className={CTA}>
                                    <Check className="size-3.5" /> Нэмэх
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowAdd(false); form.reset(); }}
                                    className={BTN}
                                >
                                    Болих
                                </button>
                            </div>
                        </form>
                    </Card>
                )}

                {/* ── Санал ── */}
                {suggestions.length > 0 && (
                    <Card className="border-amber-300/70 bg-gradient-to-br from-amber-50/70 to-white dark:border-amber-500/25 dark:from-amber-950/20 dark:to-zinc-900/60">
                        <CardHead icon={Lightbulb} tone="amber" title="Спам байж болзошгүй" count={suggestions.length} />
                        <CardNote>
                            Сүүлийн 30 хоногт 5-аас олон удаа залгасан боловч дундаж яриа нь 10
                            секундээс бага дугаарууд. Ихэвчлэн автомат зар эсвэл буруу дугаар байдаг.
                        </CardNote>
                        <div className="flex flex-wrap gap-2 p-4">
                            {suggestions.map((s) => (
                                <button
                                    key={s.number_norm}
                                    onClick={() => addSuggestion(s.number_norm)}
                                    title="Дарж жагсаалтад нэмэх"
                                    className="group inline-flex items-center gap-2 rounded-xl border border-amber-300/60 bg-white px-3 py-2 text-sm transition hover:border-amber-400 hover:bg-amber-50 active:scale-[0.98] dark:border-amber-500/25 dark:bg-white/[0.03] dark:hover:bg-amber-500/10"
                                >
                                    <span className="font-mono font-bold">{s.number_norm}</span>
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                        {s.total} удаа · дундаж {s.avg_talk}с
                                    </span>
                                    <span className="grid size-5 place-items-center rounded-md bg-amber-500/15 text-amber-600 transition group-hover:bg-amber-500 group-hover:text-white dark:text-amber-400">
                                        <Plus className="size-3" />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Card>
                )}

                {/* ── Жагсаалт ── */}
                <Card>
                    <CardHead icon={Ban} tone="red" title="Жагсаалт" count={blocked.length} />

                    {blocked.length === 0 ? (
                        <Empty
                            icon={ShieldBan}
                            title="Спам дугаар бүртгэгдээгүй байна."
                            hint="Дуудлагын бүртгэл дээрх «Спам болгох» товчоор эсвэл энд гараар нэмнэ."
                        />
                    ) : (
                        <TableWrap>
                            <table className={TABLE}>
                                <thead className={THEAD}>
                                    <tr>
                                        <th className={TH}>Дугаар</th>
                                        <th className={TH}>Нэр</th>
                                        <th className={TH}>Шалтгаан</th>
                                        <th className={cn(TH, 'text-right')}>Дуудлага</th>
                                        <th className={TH}>Нэмсэн</th>
                                        <th className={cn(TH, 'text-right')}>Үйлдэл</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {blocked.map((b) => (
                                        <tr key={b.id} className={TR}>
                                            <td className={cn(TD, 'font-mono text-[13px] font-bold whitespace-nowrap')}>{b.number_norm}</td>
                                            <td className={TD}>{b.label ?? <span className="text-muted-foreground">—</span>}</td>
                                            <td className={cn(TD, 'text-muted-foreground')}>{b.reason ?? '—'}</td>
                                            <td className={cn(TD, 'text-right font-semibold tabular-nums')}>{b.call_count}</td>
                                            <td className={cn(TD, 'text-xs text-muted-foreground')}>
                                                {b.created_by_name ?? '—'}
                                                <div className="tabular-nums">{b.created_at}</div>
                                            </td>
                                            <td className={TD}>
                                                <div className="flex justify-end">
                                                    <IconBtn icon={Trash2} title="Жагсаалтаас хасах" tone="red" onClick={() => remove(b)} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableWrap>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
