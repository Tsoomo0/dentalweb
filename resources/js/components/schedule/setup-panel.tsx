import { router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Clock3, Pencil, Plus, Repeat, Scale, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import PatternEditor, { patternSummary, type PatternEmployee } from './pattern-editor';
import { DOW_SHORT, inkOn, type Branch, type Position, type Template } from './types';

/** HR-ийн тохиргоо: ээлжийн загвар, хэв маяг, хүн хүчний шаардлага, ирцийн дүрэм. */

export interface StaffingRule { id: number; branch_id: number; position_id: number; min_count: number; weekdays: number[] | null; }

const SETTING_LABELS: Record<string, { label: string; hint: string; unit: string }> = {
    schedule_late_grace_minutes: { label: 'Хоцролтын хүлцэл', hint: 'Үүнээс бага хоцорвол хоцорсонд тооцохгүй', unit: 'мин' },
    schedule_overtime_min_minutes: { label: 'Илүү цагийн доод хэмжээ', hint: 'Хуваарийн дараа үүнээс бага саатвал илүү цаг биш', unit: 'мин' },
    schedule_weekly_hours_limit: { label: '7 хоногийн цагийн хязгаар', hint: 'Хэтэрвэл хуваарь дээр анхааруулга', unit: 'цаг' },
    schedule_min_rest_hours: { label: 'Ээлж хоорондын амралт', hint: 'Өчигдрийн ээлж дуусахаас өнөөдрийнх эхлэх хүртэл', unit: 'цаг' },
    schedule_max_consecutive_days: { label: 'Дараалан ажиллах дээд өдөр', hint: 'Хэтэрвэл анхааруулга', unit: 'өдөр' },
};

const COLORS = ['#0ea5e9', '#f97316', '#10b981', '#6366f1', '#ec4899', '#d97706', '#8b5cf6', '#14b8a6', '#ef4444', '#94a3b8'];

export default function SetupPanel({ templates, branches, positions, employees, rules, settings }: {
    templates: Template[]; branches: Branch[]; positions: Position[]; employees: PatternEmployee[];
    rules: StaffingRule[]; settings: Record<string, number>;
}) {
    const [editing, setEditing] = useState<Partial<Template> | null>(null);
    const [patternFor, setPatternFor] = useState<PatternEmployee | null>(null);
    const [patternBranch, setPatternBranch] = useState<number | ''>('');
    const [values, setValues] = useState(settings);

    const sorted = [...templates].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const positionName = useMemo(() => new Map(positions.map(p => [p.id, p.name])), [positions]);

    const move = (id: number, dir: -1 | 1) => {
        const ids = sorted.map(t => t.id);
        const i = ids.indexOf(id);
        const j = i + dir;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        router.post('/hr/schedule/templates/reorder', { ids }, { preserveScroll: true });
    };

    const removeTemplate = (t: Template) => {
        if (!confirm(`"${t.name}" загварыг устгах уу? Хуваарьт хэрэглэгдсэн бол идэвхгүй болно.`)) return;
        router.delete(`/hr/schedule/templates/${t.id}`, { preserveScroll: true });
    };

    const card = 'rounded-2xl border border-border/70 bg-card p-4 shadow-sm';
    const h2 = 'flex items-center gap-2 text-sm font-black tracking-tight';

    return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* ── Ээлжийн загвар ── */}
            <section className={`${card} xl:col-span-2`}>
                <div className="mb-3 flex items-center gap-2">
                    <h2 className={h2}><Clock3 className="size-4 text-indigo-500" /> Ээлжийн загвар</h2>
                    <p className="hidden text-[11px] text-muted-foreground sm:block">Ижил кодтой загварыг албан тушаалаар нь ялгаж болно — "Ө" эмчид 09:00, ресепшнд 08:30.</p>
                    <button type="button" onClick={() => setEditing({ kind: 'work', color: COLORS[sorted.length % COLORS.length], break_minutes: 0, is_active: true })}
                        className="ml-auto flex h-8 items-center gap-1 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">
                        <Plus className="size-3.5" /> Загвар нэмэх
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                                <th className="py-1.5 pr-2">#</th><th className="pr-2">Код</th><th className="pr-2">Нэр</th><th className="pr-2">Цаг</th>
                                <th className="pr-2">Цайны цаг</th><th className="pr-2">Хамрах хүрээ</th><th className="pr-2">Төлөв</th><th />
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((t, i) => (
                                <tr key={t.id} className={`border-b border-border/40 ${t.is_active ? '' : 'opacity-50'}`}>
                                    <td className="py-1.5 pr-2 text-muted-foreground tabular-nums">{i + 1}</td>
                                    <td className="pr-2"><span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-black" style={{ background: t.color, color: inkOn(t.color) }}>{t.code}</span></td>
                                    <td className="pr-2 font-semibold">{t.name}</td>
                                    <td className="pr-2 tabular-nums">{t.kind === 'off' ? <span className="text-muted-foreground">Амралт</span> : t.start_time ? `${t.start_time}–${t.end_time}` : 'Цаг заахгүй'}</td>
                                    <td className="pr-2 tabular-nums">{t.break_minutes ? `${t.break_minutes} мин` : '—'}</td>
                                    <td className="pr-2 text-muted-foreground">
                                        {t.position_ids?.length ? t.position_ids.map(id => positionName.get(id) ?? id).join(', ') : 'Бүх албан тушаал'}
                                        {t.branch_id ? ` · ${branches.find(b => b.id === t.branch_id)?.name ?? ''}` : ''}
                                    </td>
                                    <td className="pr-2">{t.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}</td>
                                    <td className="whitespace-nowrap text-right">
                                        <button type="button" onClick={() => move(t.id, -1)} className="rounded p-1 text-muted-foreground hover:bg-muted" title="Дээш"><ArrowUp className="size-3.5" /></button>
                                        <button type="button" onClick={() => move(t.id, 1)} className="rounded p-1 text-muted-foreground hover:bg-muted" title="Доош"><ArrowDown className="size-3.5" /></button>
                                        <button type="button" onClick={() => setEditing(t)} className="rounded p-1 text-muted-foreground hover:bg-muted" title="Засах"><Pencil className="size-3.5" /></button>
                                        <button type="button" onClick={() => removeTemplate(t)} className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600" title="Устгах"><Trash2 className="size-3.5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Хүснэгт дээр 1–9 тоо нь энэ дарааллаар, нэг үсэгтэй код нь тухайн үсгээр шууд тавигдана.</p>
            </section>

            {/* ── Хэв маяг ── */}
            <section className={card}>
                <div className="mb-3 flex items-center gap-2">
                    <h2 className={h2}><Repeat className="size-4 text-indigo-500" /> Давтагдах хэв маяг</h2>
                    <select className="ml-auto h-8 rounded-lg border bg-background px-2 text-xs" value={patternBranch}
                        onChange={e => setPatternBranch(e.target.value ? Number(e.target.value) : '')}>
                        <option value="">Бүх салбар</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
                <p className="mb-2 text-[11px] text-muted-foreground">Тогтмол хуваарьтай ажилтанд нэг удаа тохируулахад сар бүр нэг товчоор бөглөгдөнө. Хүснэгт дээрх мөрийн цэснээс "Энэ 7 хоногийг хэв маяг болгох"-оор ч үүсгэж болно.</p>
                <div className="max-h-[420px] divide-y divide-border/50 overflow-y-auto rounded-xl border">
                    {employees.filter(e => !patternBranch || e.branch_id === patternBranch).map(e => (
                        <button key={e.id} type="button" onClick={() => setPatternFor(e)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold">{e.short_name} <span className="font-normal text-muted-foreground">· {e.position ?? '—'}</span></p>
                                <p className={`truncate text-[10px] ${e.pattern ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground'}`}>{patternSummary(e.pattern, templates)}</p>
                            </div>
                            <Pencil className="size-3.5 shrink-0 text-muted-foreground" />
                        </button>
                    ))}
                </div>
            </section>

            <div className="space-y-4">
                {/* ── Хүн хүчний шаардлага ── */}
                <section className={card}>
                    <h2 className={`${h2} mb-1`}><Users className="size-4 text-indigo-500" /> Хүн хүчний доод шаардлага</h2>
                    <p className="mb-2 text-[11px] text-muted-foreground">Салбар бүрд өдөрт хамгийн багадаа хэдэн хүн байх ёстой. Хүснэгтийн бүлгийн мөрөнд "2/3" гэж харагдаж, дутвал улаан болно.</p>
                    <StaffingMatrix branches={branches} positions={positions} rules={rules} />
                </section>

                {/* ── Дүрэм ── */}
                <section className={card}>
                    <h2 className={`${h2} mb-2`}><Scale className="size-4 text-indigo-500" /> Ирц ба хуваарийн дүрэм</h2>
                    <div className="space-y-2">
                        {Object.entries(SETTING_LABELS).map(([k, meta]) => (
                            <label key={k} className="flex items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold">{meta.label}</p>
                                    <p className="text-[10px] text-muted-foreground">{meta.hint}</p>
                                </div>
                                <input type="number" className="h-8 w-20 rounded-lg border bg-background px-2 text-right text-xs tabular-nums"
                                    value={values[k] ?? 0} onChange={e => setValues(v => ({ ...v, [k]: Number(e.target.value) }))} />
                                <span className="w-8 text-[11px] text-muted-foreground">{meta.unit}</span>
                            </label>
                        ))}
                    </div>
                    <button type="button" onClick={() => router.put('/hr/schedule/settings', values, { preserveScroll: true })}
                        className="mt-3 h-8 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700">Хадгалах</button>
                </section>
            </div>

            {editing && <TemplateForm value={editing} branches={branches} positions={positions} onClose={() => setEditing(null)} />}
            {patternFor && <PatternEditor employee={patternFor} templates={templates} branches={branches} onClose={() => setPatternFor(null)} />}
        </div>
    );
}

function TemplateForm({ value, branches, positions, onClose }: {
    value: Partial<Template>; branches: Branch[]; positions: Position[]; onClose: () => void;
}) {
    const [t, setT] = useState<Partial<Template>>(value);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const field = 'mt-1 h-9 w-full rounded-lg border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

    const submit = () => {
        const data = {
            name: t.name ?? '', code: t.code ?? '', kind: t.kind ?? 'work',
            start_time: t.kind === 'off' ? null : (t.start_time || null), end_time: t.kind === 'off' ? null : (t.end_time || null),
            break_minutes: t.break_minutes ?? 0, color: t.color ?? '#6366f1', branch_id: t.branch_id ?? null,
            position_ids: t.position_ids ?? [], is_active: t.is_active ?? true,
        };
        const opts = { preserveScroll: true, onSuccess: onClose, onError: (e: Record<string, string>) => setErrors(e) };
        if (t.id) router.put(`/hr/schedule/templates/${t.id}`, data, opts);
        else router.post('/hr/schedule/templates', data, opts);
    };

    const togglePos = (id: number) => setT(x => {
        const cur = x.position_ids ?? [];
        return { ...x, position_ids: cur.includes(id) ? cur.filter(p => p !== id) : [...cur, id] };
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
            <div onMouseDown={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl">
                <h3 className="mb-3 text-sm font-bold">{t.id ? 'Загвар засах' : 'Шинэ ээлжийн загвар'}</h3>
                <div className="grid grid-cols-3 gap-2">
                    <label className="text-[11px] font-semibold text-muted-foreground">Код
                        <input className={field} maxLength={4} value={t.code ?? ''} placeholder="Ө" onChange={e => setT({ ...t, code: e.target.value })} />
                    </label>
                    <label className="col-span-2 text-[11px] font-semibold text-muted-foreground">Нэр
                        <input className={field} maxLength={50} value={t.name ?? ''} placeholder="Өглөө" onChange={e => setT({ ...t, name: e.target.value })} />
                    </label>
                    <label className="col-span-3 text-[11px] font-semibold text-muted-foreground">Төрөл
                        <select className={field} value={t.kind} onChange={e => setT({ ...t, kind: e.target.value as 'work' | 'off' })}>
                            <option value="work">Ажлын ээлж</option>
                            <option value="off">Амралт / ажиллахгүй өдөр</option>
                        </select>
                    </label>
                    {t.kind !== 'off' && (
                        <>
                            <label className="text-[11px] font-semibold text-muted-foreground">Эхлэх
                                <input type="time" className={field} value={t.start_time ?? ''} onChange={e => setT({ ...t, start_time: e.target.value })} />
                            </label>
                            <label className="text-[11px] font-semibold text-muted-foreground">Дуусах
                                <input type="time" className={field} value={t.end_time ?? ''} onChange={e => setT({ ...t, end_time: e.target.value })} />
                            </label>
                            <label className="text-[11px] font-semibold text-muted-foreground">Цайны цаг
                                <input type="number" min={0} step={15} className={field} value={t.break_minutes ?? 0} onChange={e => setT({ ...t, break_minutes: Number(e.target.value) })} />
                            </label>
                        </>
                    )}
                </div>
                <p className="mt-3 text-[11px] font-semibold text-muted-foreground">Өнгө</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                    {COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setT({ ...t, color: c })}
                            className={`size-7 rounded-lg ${t.color === c ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`} style={{ background: c }} />
                    ))}
                    <input type="color" value={t.color ?? '#6366f1'} onChange={e => setT({ ...t, color: e.target.value })} className="h-7 w-10 cursor-pointer rounded" />
                </div>
                <p className="mt-3 text-[11px] font-semibold text-muted-foreground">Албан тушаал (сонгохгүй бол бүгдэд)</p>
                <div className="mt-1 flex flex-wrap gap-1">
                    {positions.map(p => {
                        const on = t.position_ids?.includes(p.id);
                        return (
                            <button key={p.id} type="button" onClick={() => togglePos(p.id)}
                                className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${on ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' : 'hover:bg-muted'}`}>{p.name}</button>
                        );
                    })}
                </div>
                <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Салбар
                    <select className={field} value={t.branch_id ?? ''} onChange={e => setT({ ...t, branch_id: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">Бүх салбар</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </label>
                <label className="mt-3 flex items-center gap-2 text-xs font-medium">
                    <input type="checkbox" checked={t.is_active ?? true} onChange={e => setT({ ...t, is_active: e.target.checked })} className="size-4 rounded" /> Идэвхтэй
                </label>
                {Object.values(errors).length > 0 && <p className="mt-2 text-[11px] text-rose-600">{Object.values(errors)[0]}</p>}
                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="h-9 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted">Болих</button>
                    <button type="button" onClick={submit} className="h-9 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">Хадгалах</button>
                </div>
            </div>
        </div>
    );
}

function StaffingMatrix({ branches, positions, rules }: { branches: Branch[]; positions: Position[]; rules: StaffingRule[] }) {
    const [branchId, setBranchId] = useState<number>(branches[0]?.id ?? 0);
    const byPos = new Map(rules.filter(r => r.branch_id === branchId).map(r => [r.position_id, r]));

    const save = (positionId: number, minCount: number, weekdays: number[] | null) => {
        router.post('/hr/schedule/rules', { branch_id: branchId, position_id: positionId, min_count: minCount, weekdays: weekdays ?? [] }, { preserveScroll: true });
    };

    return (
        <div>
            <div className="mb-2 flex flex-wrap gap-1">
                {branches.map(b => (
                    <button key={b.id} type="button" onClick={() => setBranchId(b.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${branchId === b.id ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{b.name}</button>
                ))}
            </div>
            <div className="divide-y divide-border/50 rounded-xl border">
                {positions.map(p => {
                    const rule = byPos.get(p.id);
                    const days = rule?.weekdays ?? [1, 2, 3, 4, 5, 6, 7];
                    return (
                        <div key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5">
                            <span className="min-w-[120px] flex-1 text-xs font-medium">{p.name}</span>
                            <div className="flex gap-0.5">
                                {DOW_SHORT.map((d, i) => {
                                    const on = days.includes(i + 1);
                                    return (
                                        <button key={d} type="button" disabled={!rule}
                                            onClick={() => rule && save(p.id, rule.min_count, on ? days.filter(x => x !== i + 1) : [...days, i + 1])}
                                            className={`size-6 rounded text-[9px] font-bold ${on && rule ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' : 'text-muted-foreground'} disabled:opacity-40`}>{d}</button>
                                    );
                                })}
                            </div>
                            <input type="number" min={0} max={50} defaultValue={rule?.min_count ?? 0} key={`${branchId}-${p.id}-${rule?.min_count ?? 0}`}
                                onBlur={e => { const v = Number(e.target.value); if (v !== (rule?.min_count ?? 0)) save(p.id, v, rule?.weekdays ?? null); }}
                                className="h-7 w-14 rounded-md border bg-background px-1.5 text-right text-xs tabular-nums" title="0 = шаардлагагүй" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
