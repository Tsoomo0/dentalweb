import { router } from '@inertiajs/react';
import { Plus, Repeat, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DOW_SHORT, inkOn, mondayOf, templatesFor, todayDS, type Branch, type Template } from './types';

/**
 * Ажилтны давтагдах хэв маяг: 1–4 долоо хоногийн мөчлөг, өдөр бүр 0–2 ээлж.
 * "Хэв маягаар бөглөх" дарахад хоосон өдрүүдийг энэ дагуу бөглөнө.
 */
export interface PatternEntry { template_id: number; branch_id: number | null; }
export interface PatternData { cycle_weeks: number; starts_on: string; days: PatternEntry[][]; is_active: boolean; }
export interface PatternEmployee {
    id: number; name: string; short_name: string; position_id: number | null; position: string | null;
    branch_id: number | null; pattern: PatternData | null;
}

export default function PatternEditor({ employee, templates, branches, onClose }: {
    employee: PatternEmployee; templates: Template[]; branches: Branch[]; onClose: () => void;
}) {
    const options = useMemo(() => templatesFor(templates, employee.position_id, employee.branch_id), [templates, employee.position_id, employee.branch_id]);
    const tplMap = useMemo(() => new Map(templates.map(t => [t.id, t])), [templates]);
    const [cycle, setCycle] = useState(employee.pattern?.cycle_weeks ?? 1);
    const [startsOn, setStartsOn] = useState(employee.pattern?.starts_on ?? mondayOf(todayDS()));
    const [days, setDays] = useState<PatternEntry[][]>(() => {
        const base = employee.pattern?.days ?? [];
        return Array.from({ length: 28 }, (_, i) => base[i] ?? []);
    });
    const [active, setActive] = useState(employee.pattern?.is_active ?? true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const setDay = (i: number, entries: PatternEntry[]) => setDays(ds => ds.map((d, j) => j === i ? entries : d));

    /** Даваа–Баасанг нэг загвараар, амралтын өдрийг "Амралт"-аар дүүргэх түргэн товч. */
    const fillWeekdays = (t: Template) => {
        const off = options.find(o => o.kind === 'off');
        setDays(ds => ds.map((d, i) => {
            if (i >= cycle * 7) return d;
            const dow = i % 7;
            if (dow < 5) return [{ template_id: t.id, branch_id: null }];
            return off ? [{ template_id: off.id, branch_id: null }] : [];
        }));
    };

    const save = () => {
        setBusy(true);
        router.put(`/hr/schedule/patterns/${employee.id}`, {
            cycle_weeks: cycle, starts_on: startsOn, is_active: active,
            days: days.slice(0, cycle * 7).map(day => day.map(e => ({ template_id: e.template_id, branch_id: e.branch_id }))),
        }, { preserveScroll: true, onSuccess: onClose, onFinish: () => setBusy(false) });
    };

    const remove = () => {
        if (!confirm(`${employee.short_name}-ийн хэв маягийг устгах уу?`)) return;
        router.delete(`/hr/schedule/patterns/${employee.id}`, { preserveScroll: true, onSuccess: onClose });
    };

    const sel = 'h-7 w-full rounded-md border border-border bg-background px-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
            <div onMouseDown={e => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:rounded-2xl">
                <header className="flex items-center gap-3 border-b bg-gradient-to-br from-indigo-50 via-card to-violet-50/60 px-5 py-3.5 dark:from-indigo-950/40 dark:to-violet-950/20">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow"><Repeat className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{employee.name} — давтагдах хэв маяг</p>
                        <p className="text-[11px] text-muted-foreground">{employee.position ?? '—'} · Хоосон өдрүүдийг "Хэв маягаар бөглөх" товчоор автоматаар бөглөнө</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-black/5"><X className="size-4" /></button>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="text-[11px] font-semibold text-muted-foreground">Мөчлөг
                            <select className="mt-1 block h-9 rounded-lg border bg-background px-2 text-sm" value={cycle} onChange={e => setCycle(Number(e.target.value))}>
                                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} долоо хоног</option>)}
                            </select>
                        </label>
                        {cycle > 1 && (
                            <label className="text-[11px] font-semibold text-muted-foreground">1-р долоо хоног эхлэх (Даваа)
                                <input type="date" className="mt-1 block h-9 rounded-lg border bg-background px-2 text-sm" value={startsOn}
                                    onChange={e => setStartsOn(e.target.value ? mondayOf(e.target.value) : startsOn)} />
                            </label>
                        )}
                        <label className="flex h-9 items-center gap-2 text-xs font-medium">
                            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="size-4 rounded" /> Идэвхтэй
                        </label>
                        <div className="ml-auto flex flex-wrap items-center gap-1">
                            <span className="text-[11px] text-muted-foreground">Да–Ба түргэн:</span>
                            {options.filter(o => o.kind === 'work').map(o => (
                                <button key={o.id} type="button" onClick={() => fillWeekdays(o)} title={`${o.name} Да–Ба, бусад нь амралт`}
                                    className="h-7 rounded-lg px-2 text-[11px] font-black" style={{ background: o.color, color: inkOn(o.color) }}>{o.code}</button>
                            ))}
                        </div>
                    </div>

                    {Array.from({ length: cycle }, (_, w) => (
                        <div key={w}>
                            {cycle > 1 && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{w + 1}-р долоо хоног</p>}
                            <div className="grid grid-cols-7 gap-1.5">
                                {DOW_SHORT.map((label, dow) => {
                                    const i = w * 7 + dow;
                                    const entries = days[i] ?? [];
                                    return (
                                        <div key={dow} className={`rounded-xl border p-1.5 ${dow >= 5 ? 'bg-orange-50/50 dark:bg-orange-950/10' : 'bg-background/60'}`}>
                                            <p className={`mb-1 text-center text-[10px] font-bold ${dow >= 5 ? 'text-orange-500' : 'text-muted-foreground'}`}>{label}</p>
                                            <div className="space-y-1">
                                                {entries.map((en, k) => {
                                                    const t = tplMap.get(en.template_id);
                                                    return (
                                                        <div key={k} className="space-y-0.5 rounded-lg p-0.5" style={{ background: t ? `${t.color}22` : undefined }}>
                                                            <select className={sel} value={en.template_id}
                                                                onChange={e => setDay(i, entries.map((x, y) => y === k ? { ...x, template_id: Number(e.target.value) } : x))}>
                                                                {options.map(o => <option key={o.id} value={o.id}>{o.code} · {o.name}</option>)}
                                                            </select>
                                                            {t?.kind === 'work' && (
                                                                <select className={sel} value={en.branch_id ?? ''}
                                                                    onChange={e => setDay(i, entries.map((x, y) => y === k ? { ...x, branch_id: e.target.value ? Number(e.target.value) : null } : x))}>
                                                                    <option value="">Үндсэн салбар</option>
                                                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                                </select>
                                                            )}
                                                            <button type="button" onClick={() => setDay(i, entries.filter((_, y) => y !== k))}
                                                                className="flex w-full items-center justify-center rounded py-0.5 text-[10px] text-muted-foreground hover:text-rose-600">
                                                                <Trash2 className="size-3" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                                {entries.length < 2 && options.length > 0 && (
                                                    <button type="button" onClick={() => setDay(i, [...entries, { template_id: options[0].id, branch_id: null }])}
                                                        className="flex h-7 w-full items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted">
                                                        <Plus className="size-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <footer className="flex items-center gap-2 border-t bg-muted/20 px-5 py-3">
                    {employee.pattern && (
                        <button type="button" onClick={remove} className="h-9 rounded-lg px-3 text-sm font-medium text-rose-600 hover:bg-rose-500/10">Устгах</button>
                    )}
                    <button type="button" onClick={onClose} className="ml-auto h-9 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted">Болих</button>
                    <button type="button" disabled={busy} onClick={save}
                        className="h-9 rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-60">
                        Хадгалах
                    </button>
                </footer>
            </div>
        </div>
    );
}

/** Жагсаалтад харуулах товч тайлбар — "Да–Ба Ө · 2 долоо хоног". */
export function patternSummary(p: PatternData | null, templates: Template[]): string {
    if (!p) return 'Хэв маяггүй';
    const tpl = new Map(templates.map(t => [t.id, t]));
    const week = p.days.slice(0, 7).map(d => d.map(e => tpl.get(e.template_id)?.code ?? '?').join('+') || '·');
    return `${week.map((c, i) => `${DOW_SHORT[i]} ${c}`).join(', ')}${p.cycle_weeks > 1 ? ` · ${p.cycle_weeks} долоо хоног` : ''}${p.is_active ? '' : ' · идэвхгүй'}`;
}
