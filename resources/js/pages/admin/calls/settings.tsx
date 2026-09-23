import {
    BTN, CTA, CTA_LG, Card, CardHead, CardNote, CallsHeader, Empty, Field, INPUT, IconBtn,
    InlineStat, LABEL, Pill, Switch, TABLE, TD, TH, THEAD, TR, TableWrap,
} from '@/components/calls-ui';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle, Building2, Check, Clock, ListTree, Pencil, Phone, Plus, Save, Settings2, Trash2, X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

/* ── Types ─────────────────────────────────────────────── */
interface Extension {
    id: number;
    extension: string;
    branch_id: number | null;
    branch_name: string | null;
    user_id: number | null;
    user_name: string | null;
    staff_name: string | null;
    label: string | null;
    is_active: boolean;
}
interface Queue {
    id: number;
    name: string;
    branch_id: number | null;
    branch_name: string | null;
    label: string | null;
    is_active: boolean;
}
interface Branch { id: number; name: string }
interface Staff { id: number; name: string; position: string | null }
interface UnmappedAgent { agent: string; total: number; last_seen: string | null }
interface UnmappedQueue { queue_name: string; total: number; last_seen: string | null }
interface Operations {
    /** Гараг (1=Даваа … 7=Ням) → тухайн өдрийн цаг. Байхгүй гараг = амралт. */
    work_hours: Record<string, { start: string; end: string }>;
    sla_minutes: number;
    notify_after_hours: boolean;
    report_time: string;
}

interface Props {
    extensions: Extension[];
    queues: Queue[];
    branches: Branch[];
    staff: Staff[];
    unmappedAgents: UnmappedAgent[];
    unmappedQueues: UnmappedQueue[];
    operations: Operations;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Дуудлага', href: '/admin/calls' },
    { title: 'Тохиргоо', href: '/admin/call-settings' },
];

export default function CallSettings({ extensions, queues, branches, staff, unmappedAgents, unmappedQueues, operations }: Props) {
    const [editingExtId, setEditingExtId] = useState<number | null>(null);
    const [showAddExt, setShowAddExt] = useState(false);
    const [editingQueueId, setEditingQueueId] = useState<number | null>(null);
    const [showAddQueue, setShowAddQueue] = useState(false);

    const extAdd = useForm({ extension: '', branch_id: '', user_id: '', staff_name: '', label: '', is_active: true as boolean });
    const extEdit = useForm({ extension: '', branch_id: '', user_id: '', staff_name: '', label: '', is_active: true as boolean });
    const queueAdd = useForm({ name: '', branch_id: '', label: '', is_active: true as boolean });
    const queueEdit = useForm({ name: '', branch_id: '', label: '', is_active: true as boolean });

    // Queue холбоогүй үлдсэн салбар — тэр салбарын АЛДСАН дуудлага зөв
    // ресепшн рүү чиглэхгүй болно.
    const mappedBranchIds = new Set(queues.filter((q) => q.branch_id).map((q) => q.branch_id));
    const branchesWithoutQueues = branches.filter((b) => !mappedBranchIds.has(b.id));
    const unmappedTotal = unmappedAgents.length + unmappedQueues.length;

    /* ── Дотуур дугаар ── */
    function startEditExt(e: Extension) {
        setEditingExtId(e.id);
        setShowAddExt(false);
        extEdit.setData({
            extension: e.extension,
            branch_id: e.branch_id ? String(e.branch_id) : '',
            user_id: e.user_id ? String(e.user_id) : '',
            staff_name: e.staff_name ?? '',
            label: e.label ?? '',
            is_active: e.is_active,
        });
    }

    function submitAddExt(ev: FormEvent) {
        ev.preventDefault();
        extAdd.post('/admin/call-settings/extensions', {
            preserveScroll: true,
            onSuccess: () => { extAdd.reset(); setShowAddExt(false); },
        });
    }

    function submitEditExt(ev: FormEvent, id: number) {
        ev.preventDefault();
        extEdit.patch(`/admin/call-settings/extensions/${id}`, {
            preserveScroll: true,
            onSuccess: () => setEditingExtId(null),
        });
    }

    function removeExt(e: Extension) {
        if (confirm(`Дугаар ${e.extension}-ийг устгах уу?\n\nӨмнөх дуудлагууд устахгүй — зөвхөн цаашид ирэх дуудлага салбаргүй болно.`)) {
            router.delete(`/admin/call-settings/extensions/${e.id}`, { preserveScroll: true });
        }
    }

    /** Бүртгэгдээгүй дугаарыг нэмэх маягт руу дамжуулна. */
    function prefillAgent(agent: string) {
        setEditingExtId(null);
        setShowAddExt(true);
        extAdd.setData({ extension: agent, branch_id: '', user_id: '', staff_name: '', label: '', is_active: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ── Queue ── */
    function startEditQueue(q: Queue) {
        setEditingQueueId(q.id);
        setShowAddQueue(false);
        queueEdit.setData({
            name: q.name,
            branch_id: q.branch_id ? String(q.branch_id) : '',
            label: q.label ?? '',
            is_active: q.is_active,
        });
    }

    function submitAddQueue(ev: FormEvent) {
        ev.preventDefault();
        queueAdd.post('/admin/call-settings/queues', {
            preserveScroll: true,
            onSuccess: () => { queueAdd.reset(); setShowAddQueue(false); },
        });
    }

    function submitEditQueue(ev: FormEvent, id: number) {
        ev.preventDefault();
        queueEdit.patch(`/admin/call-settings/queues/${id}`, {
            preserveScroll: true,
            onSuccess: () => setEditingQueueId(null),
        });
    }

    function removeQueue(q: Queue) {
        if (confirm(`Queue «${q.name}»-ийг устгах уу?\n\nЭнэ queue-гээс ирэх алдсан дуудлага салбаргүй болж, зөвхөн админд харагдана.`)) {
            router.delete(`/admin/call-settings/queues/${q.id}`, { preserveScroll: true });
        }
    }

    function prefillQueue(name: string) {
        setEditingQueueId(null);
        setShowAddQueue(true);
        queueAdd.setData({ name, branch_id: '', label: '', is_active: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Дуудлагын тохиргоо" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <CallsHeader
                    icon={Settings2}
                    title="Дуудлагын тохиргоо"
                    subtitle="CallPro интеграц — дугаар, queue, ажлын цагийн зураглал"
                    current="settings"
                >
                    <div className="grid grid-cols-2 divide-x divide-indigo-100/70 border-t border-indigo-100/70 sm:grid-cols-4 dark:divide-white/5 dark:border-white/5">
                        <InlineStat label="Дотуур дугаар" value={extensions.length} tone="indigo" />
                        <InlineStat label="Queue" value={queues.length} tone="sky" />
                        <InlineStat label="Салбар" value={branches.length} />
                        <InlineStat label="Бүртгэгдээгүй" value={unmappedTotal} tone={unmappedTotal > 0 ? 'amber' : 'slate'} />
                    </div>
                </CallsHeader>

                {/* Алдсан дуудлага зөвхөн queue-гээр салбартаа хуваарилагддаг тул
                    queue холбоогүй салбар байвал энэ нь чимээгүй эвдрэл болно. */}
                {branchesWithoutQueues.length > 0 && (
                    <div className="flex gap-3 rounded-2xl border border-amber-300/70 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm dark:border-amber-500/25 dark:from-amber-950/25 dark:to-zinc-900/60">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-4" />
                        </span>
                        <div className="text-sm">
                            <p className="font-bold text-amber-700 dark:text-amber-400">Queue холбоогүй салбар байна</p>
                            <p className="mt-1 leading-relaxed text-muted-foreground">
                                <span className="font-semibold text-foreground">{branchesWithoutQueues.map((b) => b.name).join(', ')}</span>
                                {' — '}алдсан дуудлагад дотуур дугаар ирдэггүй тул queue холбоогүй бол
                                тэр салбарын алдсан дуудлага зөв ресепшн рүү хүрэхгүй.
                            </p>
                        </div>
                    </div>
                )}

                <OperationsCard operations={operations} />

                {/* ── Дотуур дугаар ─────────────────────────────────── */}
                <Card>
                    <CardHead
                        icon={Phone}
                        title="Дотуур дугаар → салбар"
                        count={extensions.length}
                        actions={
                            !showAddExt && (
                                <button onClick={() => { setShowAddExt(true); setEditingExtId(null); }} className={CTA}>
                                    <Plus className="size-3.5" /> Дугаар нэмэх
                                </button>
                            )
                        }
                    />
                    <CardNote>
                        Хариулсан дуудлага энэ дугаараар салбартаа хуваарилагдана. Салбарыг хоосон
                        орхивол аль ч салбарт харьяалагдахгүй. Алдсан дуудлагын мэдэгдэл нь
                        дугаарт холбогдсон ажилтанд очдог тул хүн бүрийнхээ дугаарыг холбоно уу —
                        нийтийн суурин утсыг хүнд холбохын оронд гараар тэмдэглэнэ.
                    </CardNote>

                    {showAddExt && (
                        <form
                            onSubmit={submitAddExt}
                            className="grid gap-3 border-b border-gray-200/80 bg-indigo-500/[0.04] p-4 md:grid-cols-5 dark:border-white/10"
                        >
                            <Field label="Дугаар" error={extAdd.errors.extension}>
                                <input
                                    autoFocus
                                    value={extAdd.data.extension}
                                    onChange={(e) => extAdd.setData('extension', e.target.value)}
                                    placeholder="101"
                                    className={cn(INPUT, 'font-mono')}
                                />
                            </Field>
                            <Field label="Салбар" error={extAdd.errors.branch_id}>
                                <select
                                    value={extAdd.data.branch_id}
                                    onChange={(e) => extAdd.setData('branch_id', e.target.value)}
                                    className={INPUT}
                                >
                                    <option value="">— салбаргүй —</option>
                                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </Field>
                            <StaffField
                                staff={staff}
                                userId={extAdd.data.user_id}
                                staffName={extAdd.data.staff_name}
                                onUserId={(v) => extAdd.setData('user_id', v)}
                                onStaffName={(v) => extAdd.setData('staff_name', v)}
                                error={extAdd.errors.user_id ?? extAdd.errors.staff_name}
                            />
                            <Field label="Тайлбар" error={extAdd.errors.label}>
                                <input
                                    value={extAdd.data.label}
                                    onChange={(e) => extAdd.setData('label', e.target.value)}
                                    placeholder="Ресепшн 1"
                                    className={INPUT}
                                />
                            </Field>
                            <div className="flex items-end gap-2">
                                <button type="submit" disabled={extAdd.processing} className={CTA}>
                                    <Check className="size-3.5" /> Хадгалах
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowAddExt(false); extAdd.reset(); }}
                                    className={BTN}
                                >
                                    Болих
                                </button>
                            </div>
                        </form>
                    )}

                    {extensions.length === 0 ? (
                        <Empty
                            icon={Phone}
                            title="Дугаар бүртгэгдээгүй байна."
                            hint="Хариулсан дуудлага салбартаа хуваарилагдахын тулд дор хаяж нэг дугаар шаардлагатай."
                        />
                    ) : (
                        <TableWrap>
                            <table className={TABLE}>
                                <thead className={THEAD}>
                                    <tr>
                                        <th className={TH}>Дугаар</th>
                                        <th className={TH}>Салбар</th>
                                        <th className={TH}>Ажилтан</th>
                                        <th className={TH}>Тайлбар</th>
                                        <th className={TH}>Төлөв</th>
                                        <th className={cn(TH, 'text-right')}>Үйлдэл</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {extensions.map((e) => editingExtId === e.id ? (
                                        <tr key={e.id} className="border-b border-gray-100 bg-indigo-500/[0.05] dark:border-white/5">
                                            <td colSpan={6} className="p-4">
                                                <form onSubmit={(ev) => submitEditExt(ev, e.id)} className="grid gap-3 md:grid-cols-5">
                                                    <Field label="Дугаар" error={extEdit.errors.extension}>
                                                        <input
                                                            value={extEdit.data.extension}
                                                            onChange={(ev) => extEdit.setData('extension', ev.target.value)}
                                                            className={cn(INPUT, 'font-mono')}
                                                        />
                                                    </Field>
                                                    <Field label="Салбар" error={extEdit.errors.branch_id}>
                                                        <select
                                                            value={extEdit.data.branch_id}
                                                            onChange={(ev) => extEdit.setData('branch_id', ev.target.value)}
                                                            className={INPUT}
                                                        >
                                                            <option value="">— салбаргүй —</option>
                                                            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                        </select>
                                                    </Field>
                                                    <StaffField
                                                        staff={staff}
                                                        userId={extEdit.data.user_id}
                                                        staffName={extEdit.data.staff_name}
                                                        onUserId={(v) => extEdit.setData('user_id', v)}
                                                        onStaffName={(v) => extEdit.setData('staff_name', v)}
                                                        error={extEdit.errors.user_id ?? extEdit.errors.staff_name}
                                                    />
                                                    <Field label="Тайлбар" error={extEdit.errors.label}>
                                                        <input
                                                            value={extEdit.data.label}
                                                            onChange={(ev) => extEdit.setData('label', ev.target.value)}
                                                            className={INPUT}
                                                        />
                                                    </Field>
                                                    <div className="flex items-end justify-between gap-2">
                                                        <Switch
                                                            checked={extEdit.data.is_active}
                                                            onChange={(v) => extEdit.setData('is_active', v)}
                                                            label={<span className="text-xs font-medium">Идэвхтэй</span>}
                                                        />
                                                        <div className="flex gap-1.5">
                                                            <button type="submit" disabled={extEdit.processing} className={CTA}>
                                                                <Save className="size-3.5" /> Хадгалах
                                                            </button>
                                                            <button type="button" onClick={() => setEditingExtId(null)} className={BTN}>
                                                                <X className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </form>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={e.id} className={TR}>
                                            <td className={cn(TD, 'font-mono text-[13px] font-bold')}>{e.extension}</td>
                                            <td className={TD}>
                                                {e.branch_name ?? <span className="text-muted-foreground">салбаргүй</span>}
                                            </td>
                                            <td className={TD}>
                                                {e.user_name
                                                    ?? (e.staff_name
                                                        ? <span className="text-muted-foreground italic">{e.staff_name}</span>
                                                        : <span className="text-muted-foreground">—</span>)}
                                            </td>
                                            <td className={cn(TD, 'text-muted-foreground')}>{e.label ?? '—'}</td>
                                            <td className={TD}><StatusPill active={e.is_active} /></td>
                                            <td className={TD}>
                                                <div className="flex justify-end gap-1">
                                                    <IconBtn icon={Pencil} title="Засах" onClick={() => startEditExt(e)} />
                                                    <IconBtn icon={Trash2} title="Устгах" tone="red" onClick={() => removeExt(e)} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableWrap>
                    )}
                </Card>

                {/* ── Queue ─────────────────────────────────────────── */}
                <Card>
                    <CardHead
                        icon={Building2}
                        tone="sky"
                        title="IVR товч → салбар"
                        count={queues.length}
                        actions={
                            !showAddQueue && (
                                <button onClick={() => { setShowAddQueue(true); setEditingQueueId(null); }} className={CTA}>
                                    <Plus className="size-3.5" /> Товч нэмэх
                                </button>
                            )
                        }
                    />
                    <CardNote>
                        70003931 дээр дарсан товчийг CallPro «queue нэр» болгон илгээдэг — 1 дарвал
                        «1» ирнэ. Алдсан дуудлагад дотуур дугаар ирдэггүй тул салбарыг зөвхөн эндээс
                        тодорхойлно. Салбарыг хоосон орхивол алдсан дуудлага зөвхөн админд харагдана
                        (жишээ: 0 — мэдээлэл авах).
                    </CardNote>

                    {showAddQueue && (
                        <form
                            onSubmit={submitAddQueue}
                            className="grid gap-3 border-b border-gray-200/80 bg-sky-500/[0.04] p-4 md:grid-cols-4 dark:border-white/10"
                        >
                            <Field label="IVR товч" error={queueAdd.errors.name}>
                                <input
                                    autoFocus
                                    value={queueAdd.data.name}
                                    onChange={(e) => queueAdd.setData('name', e.target.value)}
                                    placeholder="3"
                                    className={cn(INPUT, 'font-mono')}
                                />
                            </Field>
                            <Field label="Салбар" error={queueAdd.errors.branch_id}>
                                <select
                                    value={queueAdd.data.branch_id}
                                    onChange={(e) => queueAdd.setData('branch_id', e.target.value)}
                                    className={INPUT}
                                >
                                    <option value="">— салбаргүй (зөвхөн админд) —</option>
                                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Тайлбар" error={queueAdd.errors.label}>
                                <input
                                    value={queueAdd.data.label}
                                    onChange={(e) => queueAdd.setData('label', e.target.value)}
                                    placeholder="Баянзүрх салбар"
                                    className={INPUT}
                                />
                            </Field>
                            <div className="flex items-end gap-2">
                                <button type="submit" disabled={queueAdd.processing} className={CTA}>
                                    <Check className="size-3.5" /> Хадгалах
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowAddQueue(false); queueAdd.reset(); }}
                                    className={BTN}
                                >
                                    Болих
                                </button>
                            </div>
                        </form>
                    )}

                    {queues.length === 0 ? (
                        <Empty
                            icon={Building2}
                            title="Queue бүртгэгдээгүй байна."
                            hint="CallPro console → History → Queue хэсгээс нэрсийг нь хараарай."
                        />
                    ) : (
                        <TableWrap>
                            <table className={TABLE}>
                                <thead className={THEAD}>
                                    <tr>
                                        <th className={TH}>Queue</th>
                                        <th className={TH}>Салбар</th>
                                        <th className={TH}>Тайлбар</th>
                                        <th className={TH}>Төлөв</th>
                                        <th className={cn(TH, 'text-right')}>Үйлдэл</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {queues.map((q) => editingQueueId === q.id ? (
                                        <tr key={q.id} className="border-b border-gray-100 bg-sky-500/[0.05] dark:border-white/5">
                                            <td colSpan={5} className="p-4">
                                                <form onSubmit={(ev) => submitEditQueue(ev, q.id)} className="grid gap-3 md:grid-cols-4">
                                                    <Field label="IVR товч" error={queueEdit.errors.name}>
                                                        <input
                                                            value={queueEdit.data.name}
                                                            onChange={(ev) => queueEdit.setData('name', ev.target.value)}
                                                            className={cn(INPUT, 'font-mono')}
                                                        />
                                                    </Field>
                                                    <Field label="Салбар" error={queueEdit.errors.branch_id}>
                                                        <select
                                                            value={queueEdit.data.branch_id}
                                                            onChange={(ev) => queueEdit.setData('branch_id', ev.target.value)}
                                                            className={INPUT}
                                                        >
                                                            <option value="">— салбаргүй (зөвхөн админд) —</option>
                                                            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                        </select>
                                                    </Field>
                                                    <Field label="Тайлбар" error={queueEdit.errors.label}>
                                                        <input
                                                            value={queueEdit.data.label}
                                                            onChange={(ev) => queueEdit.setData('label', ev.target.value)}
                                                            className={INPUT}
                                                        />
                                                    </Field>
                                                    <div className="flex items-end justify-between gap-2">
                                                        <Switch
                                                            checked={queueEdit.data.is_active}
                                                            onChange={(v) => queueEdit.setData('is_active', v)}
                                                            label={<span className="text-xs font-medium">Идэвхтэй</span>}
                                                        />
                                                        <div className="flex gap-1.5">
                                                            <button type="submit" disabled={queueEdit.processing} className={CTA}>
                                                                <Save className="size-3.5" /> Хадгалах
                                                            </button>
                                                            <button type="button" onClick={() => setEditingQueueId(null)} className={BTN}>
                                                                <X className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </form>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={q.id} className={TR}>
                                            <td className={cn(TD, 'font-mono text-[13px] font-bold')}>{q.name}</td>
                                            <td className={TD}>
                                                {q.branch_name ?? (
                                                    <span className="text-muted-foreground">салбаргүй — зөвхөн админд</span>
                                                )}
                                            </td>
                                            <td className={cn(TD, 'text-muted-foreground')}>{q.label ?? '—'}</td>
                                            <td className={TD}><StatusPill active={q.is_active} /></td>
                                            <td className={TD}>
                                                <div className="flex justify-end gap-1">
                                                    <IconBtn icon={Pencil} title="Засах" onClick={() => startEditQueue(q)} />
                                                    <IconBtn icon={Trash2} title="Устгах" tone="red" onClick={() => removeQueue(q)} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableWrap>
                    )}
                </Card>

                {/* ── Бүртгэгдээгүй утгууд ──────────────────────────── */}
                {unmappedTotal > 0 && (
                    <Card className="border-amber-300/70 bg-gradient-to-br from-amber-50/70 to-white dark:border-amber-500/25 dark:from-amber-950/20 dark:to-zinc-900/60">
                        <CardHead icon={ListTree} tone="amber" title="Бүртгэгдээгүй утга ирж байна" count={unmappedTotal} />
                        <CardNote>
                            CallPro-с ирсэн боловч огт бүртгэгдээгүй утгууд. Эдгээр дуудлага
                            салбаргүй хадгалагдсан тул дарж бүртгэнэ үү.
                        </CardNote>

                        {unmappedAgents.length > 0 && (
                            <div className="border-b border-gray-200/80 p-4 dark:border-white/10">
                                <p className={LABEL}>Дотуур дугаар</p>
                                <div className="flex flex-wrap gap-2">
                                    {unmappedAgents.map((a) => (
                                        <UnmappedChip
                                            key={a.agent}
                                            value={a.agent}
                                            total={a.total}
                                            onClick={() => prefillAgent(a.agent)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {unmappedQueues.length > 0 && (
                            <div className="p-4">
                                <p className={LABEL}>Queue</p>
                                <div className="flex flex-wrap gap-2">
                                    {unmappedQueues.map((q) => (
                                        <UnmappedChip
                                            key={q.queue_name}
                                            value={q.queue_name}
                                            total={q.total}
                                            onClick={() => prefillQueue(q.queue_name)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

/**
 * Дугаарыг ХҮНД эсвэл ТЭМДЭГЛЭГЭЭНД холбоно.
 *
 * Бүх дугаар тодорхой нэг хүнийх байдаггүй: ресепшний ширээн дээрх суурин
 * утсыг хэд хэдэн ажилтан ээлжлэн авдаг. Ийм дугаарыг хүнд холбож болохгүй,
 * гэхдээ хоосон орхивол тохиргоо дутуу юу, зориуд хоосон юу нь ялгагдахгүй.
 *
 * Хоёулаа зэрэг бөглөгдөхгүй: ажилтан сонгомогц гараар бичих нүд хаагдана.
 * Алдсан дуудлагын мэдэгдэл ХҮНД холбогдсон дугаараар л хаяглагддаг тул
 * «хэн хариуцах вэ» гэдэгт нэг л хариулт байх ёстой.
 */
function StaffField({ staff, userId, staffName, onUserId, onStaffName, error }: {
    staff: Staff[];
    userId: string;
    staffName: string;
    onUserId: (v: string) => void;
    onStaffName: (v: string) => void;
    error?: string;
}) {
    const linked = userId !== '';

    return (
        <Field label="Ажилтан" error={error}>
            <select
                value={userId}
                onChange={(e) => {
                    onUserId(e.target.value);
                    if (e.target.value !== '') onStaffName('');
                }}
                className={INPUT}
            >
                <option value="">— хүнд холбоогүй —</option>
                {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                        {s.position ? `${s.name} · ${s.position}` : s.name}
                    </option>
                ))}
            </select>

            <input
                value={linked ? '' : staffName}
                onChange={(e) => onStaffName(e.target.value)}
                disabled={linked}
                placeholder="эсвэл гараар: Суурин утас"
                className={cn(INPUT, 'mt-1.5', linked && 'opacity-50')}
            />
        </Field>
    );
}

const WEEKDAYS = [
    { value: 1, label: 'Даваа' }, { value: 2, label: 'Мягмар' }, { value: 3, label: 'Лхагва' },
    { value: 4, label: 'Пүрэв' }, { value: 5, label: 'Баасан' }, { value: 6, label: 'Бямба' },
    { value: 7, label: 'Ням' },
];

const DAY_OFF = { start: '09:00', end: '20:00' };

/** Хуваарь дээрх нэг мөр. Амарсан өдрийн цаг ч хадгалагдана — дахин асаахад сэргэнэ. */
interface DayRow { on: boolean; start: string; end: string }

function toSchedule(hours: Operations['work_hours']): Record<number, DayRow> {
    return Object.fromEntries(
        WEEKDAYS.map(({ value }) => {
            const h = hours[String(value)];

            return [value, { on: !!h, start: h?.start ?? DAY_OFF.start, end: h?.end ?? DAY_OFF.end }];
        }),
    );
}

function toHours(schedule: Record<number, DayRow>): Operations['work_hours'] {
    return Object.fromEntries(
        Object.entries(schedule)
            .filter(([, row]) => row.on)
            .map(([day, row]) => [day, { start: row.start, end: row.end }]),
    );
}

/* ── Ажлын цаг ба SLA ──────────────────────────────────── */
function OperationsCard({ operations }: { operations: Operations }) {
    const [schedule, setSchedule] = useState<Record<number, DayRow>>(() => toSchedule(operations.work_hours));

    const form = useForm({
        work_hours: operations.work_hours,
        sla_minutes: operations.sla_minutes,
        notify_after_hours: operations.notify_after_hours,
        report_time: operations.report_time,
    });

    function patchDay(day: number, changes: Partial<DayRow>) {
        const next = { ...schedule, [day]: { ...schedule[day], ...changes } };
        setSchedule(next);
        form.setData('work_hours', toHours(next));
    }

    /**
     * Эхний ажлын өдрийн цагийг бусад БҮХ ажлын өдөрт хуулна.
     *
     * Ихэнх салбар ажлын өдрүүддээ ижил цагтай, зөвхөн бямба нь өөр байдаг.
     * 6 өдрийн цагийг гараар бичих нь алдаа гаргах хамгийн түгээмэл зам.
     */
    function copyFirstDayToAll() {
        const first = WEEKDAYS.map((d) => d.value).find((d) => schedule[d].on);

        if (first === undefined) return;

        const { start, end } = schedule[first];
        const next = Object.fromEntries(
            Object.entries(schedule).map(([day, row]) => [day, row.on ? { ...row, start, end } : row]),
        ) as Record<number, DayRow>;

        setSchedule(next);
        form.setData('work_hours', toHours(next));
    }

    const workingDays = WEEKDAYS.filter((d) => schedule[d.value].on).length;

    function submit(e: FormEvent) {
        e.preventDefault();
        form.patch('/admin/call-settings/operations', { preserveScroll: true });
    }

    return (
        <Card>
            <CardHead icon={Clock} tone="violet" title="Ажлын цаг ба хяналт" />
            <CardNote>
                Гараг бүрт өөр цаг тавьж болно — бямба богино ажилладаг бол тэр өдрөө л
                засна. Ажлын цагаас гадуур ирсэн дуудлагыг тусад нь тооцно: тэр үед хэн ч
                байхгүй тул ажилтныг буруутгах нь шударга бус. Мөн шөнө дунд мэдэгдэл
                өгөхгүй, SLA сэрэмжлүүлэг ажиллуулахгүй.
            </CardNote>

            <form onSubmit={submit} className="space-y-5 p-4">
                <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <p className={LABEL}>Ажлын хуваарь</p>
                        {workingDays > 1 && (
                            <button
                                type="button"
                                onClick={copyFirstDayToAll}
                                className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                                Эхний өдрийн цагийг бүгдэд хуулах
                            </button>
                        )}
                    </div>

                    <div className="divide-y divide-gray-200/80 overflow-hidden rounded-xl border border-gray-200 dark:divide-white/10 dark:border-white/10">
                        {WEEKDAYS.map((d) => {
                            const row = schedule[d.value];
                            // Шөнө дамжсан ээлж (20:00–02:00) — админ андуурсан эсэхээ мэдэх ёстой.
                            const overnight = row.on && row.start > row.end;

                            return (
                                <div
                                    key={d.value}
                                    className={cn(
                                        'flex flex-wrap items-center gap-3 px-3.5 py-2.5 transition',
                                        row.on ? 'bg-white dark:bg-transparent' : 'bg-gray-50/70 dark:bg-white/[0.02]',
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => patchDay(d.value, { on: !row.on })}
                                        aria-pressed={row.on}
                                        className={cn(
                                            'w-24 shrink-0 rounded-lg border px-2 py-1.5 text-sm font-semibold transition active:scale-95',
                                            row.on
                                                ? 'border-transparent bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-sm shadow-indigo-500/25'
                                                : 'border-gray-200 bg-white text-muted-foreground hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]',
                                        )}
                                    >
                                        {d.label}
                                    </button>

                                    {row.on ? (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input
                                                type="time" value={row.start}
                                                onChange={(e) => patchDay(d.value, { start: e.target.value })}
                                                className={cn(INPUT, 'w-32')}
                                            />
                                            <span className="text-muted-foreground">—</span>
                                            <input
                                                type="time" value={row.end}
                                                onChange={(e) => patchDay(d.value, { end: e.target.value })}
                                                className={cn(INPUT, 'w-32')}
                                            />
                                            {overnight && <Pill tone="amber">шөнө дамжина</Pill>}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Амарна</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {Object.keys(form.errors)
                        .filter((k) => k.startsWith('work_hours'))
                        .slice(0, 1)
                        .map((k) => (
                            <p key={k} className="mt-1 text-[11px] font-medium text-red-600">
                                {form.errors[k as keyof typeof form.errors]}
                            </p>
                        ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Барих хугацаа (мин)" error={form.errors.sla_minutes}>
                        <input
                            type="number" min={1} max={1440} value={form.data.sla_minutes}
                            onChange={(e) => form.setData('sla_minutes', Number(e.target.value))}
                            className={INPUT}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">Дараа удирдлагад сэрэмжлүүлнэ</p>
                    </Field>
                    <Field label="Тайлан илгээх цаг" error={form.errors.report_time}>
                        <input
                            type="time" value={form.data.report_time}
                            onChange={(e) => form.setData('report_time', e.target.value)}
                            className={INPUT}
                        />
                    </Field>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
                    <Switch
                        checked={form.data.notify_after_hours}
                        onChange={(v) => form.setData('notify_after_hours', v)}
                        label="Ажлын цагаас гадуурх алдсан дуудлагад ч мэдэгдэл өгөх"
                        hint="анхдагчаар унтраалттай"
                    />
                </div>

                <div className="flex justify-end">
                    <button type="submit" disabled={form.processing} className={CTA_LG}>
                        <Save className="size-4" /> Хадгалах
                    </button>
                </div>
            </form>
        </Card>
    );
}

function StatusPill({ active }: { active: boolean }) {
    return <Pill tone={active ? 'emerald' : 'slate'}>{active ? 'Идэвхтэй' : 'Идэвхгүй'}</Pill>;
}

/** Бүртгэгдээгүй утгыг дарж нэмэх маягт руу дамжуулах чип. */
function UnmappedChip({ value, total, onClick }: { value: string; total: number; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            title="Дарж бүртгэх"
            className="group inline-flex items-center gap-2 rounded-xl border border-amber-300/60 bg-white px-3 py-2 text-sm transition hover:border-amber-400 hover:bg-amber-50 active:scale-[0.98] dark:border-amber-500/25 dark:bg-white/[0.03] dark:hover:bg-amber-500/10"
        >
            <span className="font-mono font-bold">{value}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{total} дуудлага</span>
            <span className="grid size-5 place-items-center rounded-md bg-amber-500/15 text-amber-600 transition group-hover:bg-amber-500 group-hover:text-white dark:text-amber-400">
                <Plus className="size-3" />
            </span>
        </button>
    );
}
