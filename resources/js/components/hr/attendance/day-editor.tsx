import { router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { Info, Plus, Trash2, X } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Avatar, dayLabel, fieldCls, type Option, SOURCE_META, type Source } from './shared';

interface DayPunch {
    id: number; time: string; source: Source; punch_type: number | null;
    device_name: string | null; note: string | null; created_by: string | null;
    created_at: string | null; can_delete: boolean;
}

/** Засах цонхонд нээгдсэн өдөр — мөрөөс бол ажилтан/огноо тогтмол, "Ирц нэмэх"-ээс бол сонгоно. */
export interface EditTarget { employee_id: number | ''; date: string; name: string | null; photo_url: string | null }

/**
 * Нэг өдрийн бүх түүхий бүртгэл + гараар засах. Төхөөрөмж/утасны бүртгэлийг
 * устгахгүй — зөвхөн нэмэлт бүртгэл үүсгэнэ, шалтгаан ба хэн засав нь хадгалагдана.
 */
export function DayEditor({ target, employees, onClose }: { target: EditTarget; employees: Option[]; onClose: () => void }) {
    const fixed = target.employee_id !== '';
    const [punches, setPunches] = useState<DayPunch[] | null>(null);

    const form = useForm({
        employee_id: target.employee_id as number | '',
        date: target.date,
        checked_in_at: '',
        checked_out_at: '',
        note: '',
    });

    const { employee_id, date } = form.data;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        if (!employee_id || !date) { setPunches(null); return; }
        let alive = true;
        setPunches(null);
        axios.get<{ punches: DayPunch[] }>('/hr/attendance/day', { params: { employee_id, date } })
            .then(r => { if (alive) setPunches(r.data.punches); })
            .catch(() => { if (alive) setPunches([]); });
        return () => { alive = false; };
    }, [employee_id, date]);

    function submit(e: FormEvent) {
        e.preventDefault();
        form.post('/hr/attendance/manual', { preserveScroll: true, onSuccess: onClose });
    }

    function remove(p: DayPunch) {
        if (!confirm(`${p.time.slice(0, 5)}-ийн гараар нэмсэн бүртгэлийг устгах уу?`)) return;
        router.delete(`/hr/attendance/punches/${p.id}`, {
            preserveScroll: true,
            onSuccess: () => setPunches(list => (list ?? []).filter(x => x.id !== p.id)),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <form onSubmit={submit} onClick={e => e.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <header className="relative flex items-center gap-3 bg-gradient-to-br from-sky-50 via-white to-indigo-50/70 px-5 py-4 dark:from-sky-950/40 dark:via-background dark:to-indigo-950/30">
                    {fixed && target.name
                        ? <Avatar name={target.name} photoUrl={target.photo_url} seed={Number(target.employee_id)} size="size-10" />
                        : <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md"><Plus className="size-5" /></span>}
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{fixed ? target.name : 'Ирц нэмэх'}</p>
                        <p className="text-[11px] text-muted-foreground">{fixed ? (date ? dayLabel(date) : '') : 'Хуруу дарахаа мартсан ажилтанд'}</p>
                    </div>
                    <button type="button" onClick={onClose} className="ml-auto rounded-lg p-1.5 text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10">
                        <X className="size-4" />
                    </button>
                </header>

                <div className="space-y-4 px-5 py-4">
                    {!fixed && (
                        <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2">
                            <div>
                                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Ажилтан</label>
                                <select className={fieldCls} value={String(employee_id)}
                                    onChange={e => form.setData('employee_id', e.target.value ? Number(e.target.value) : '')}>
                                    <option value="">— Сонгох —</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                                {form.errors.employee_id && <p className="mt-1 text-[11px] text-rose-600">{form.errors.employee_id}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Огноо</label>
                                <input type="date" className={fieldCls} value={date} onChange={e => form.setData('date', e.target.value)} />
                                {form.errors.date && <p className="mt-1 text-[11px] text-rose-600">{form.errors.date}</p>}
                            </div>
                        </div>
                    )}

                    {/* Тухайн өдрийн бүртгэлүүд */}
                    {employee_id && date && (
                        <div>
                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Бүртгэлүүд</p>
                            <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                                {punches === null ? (
                                    <p className="px-3 py-3 text-xs text-muted-foreground">Ачаалж байна…</p>
                                ) : punches.length === 0 ? (
                                    <p className="px-3 py-3 text-xs text-muted-foreground">Энэ өдөр бүртгэл алга.</p>
                                ) : punches.map(p => {
                                    const meta = SOURCE_META[p.source];
                                    return (
                                        <div key={p.id} className="flex items-start gap-3 px-3 py-2">
                                            <span className="pt-px text-[13px] font-bold tabular-nums text-foreground">{p.time.slice(0, 5)}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="flex items-center gap-1 text-xs font-medium text-foreground">
                                                    {meta && <meta.icon className="size-3 text-sky-500/80" />}
                                                    {p.source === 'manual' ? meta.label : p.device_name ?? meta?.label}
                                                </p>
                                                {p.source === 'manual' && (
                                                    <p className="truncate text-[11px] text-muted-foreground" title={p.note ?? ''}>
                                                        {p.created_by ?? 'HR'}{p.note ? ` · ${p.note}` : ''}
                                                    </p>
                                                )}
                                            </div>
                                            {p.can_delete && (
                                                <button type="button" onClick={() => remove(p)} title="Гараар нэмсэн бүртгэлийг устгах"
                                                    className="rounded-md p-1 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600">
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Гараар нэмэх */}
                    <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Гараар нэмэх</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="mb-1 block text-[11px] text-muted-foreground">Ирсэн цаг</label>
                                <input type="time" className={fieldCls} value={form.data.checked_in_at} onChange={e => form.setData('checked_in_at', e.target.value)} />
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] text-muted-foreground">Тарсан цаг</label>
                                <input type="time" className={fieldCls} value={form.data.checked_out_at} onChange={e => form.setData('checked_out_at', e.target.value)} />
                            </div>
                        </div>
                        {(form.errors.checked_in_at || form.errors.checked_out_at) && (
                            <p className="mt-1 text-[11px] text-rose-600">{form.errors.checked_in_at ?? form.errors.checked_out_at}</p>
                        )}
                        <label className="mb-1 mt-2 block text-[11px] text-muted-foreground">Шалтгаан</label>
                        <input className={fieldCls} value={form.data.note} maxLength={255}
                            placeholder="Жишээ: тарахдаа хуруу дарахаа мартсан"
                            onChange={e => form.setData('note', e.target.value)} />
                        {form.errors.note && <p className="mt-1 text-[11px] text-rose-600">{form.errors.note}</p>}
                        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                            <Info className="mt-px size-3 shrink-0" />
                            Төхөөрөмжийн бүртгэл устахгүй — нэмэлт бүртгэл үүсч, хэн яагаад нэмсэн нь хадгалагдана.
                        </p>
                    </div>
                </div>

                <footer className="flex justify-end gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
                    <button type="button" onClick={onClose} className="h-9 rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">Болих</button>
                    <button type="submit" disabled={form.processing}
                        className="h-9 rounded-lg bg-gradient-to-b from-sky-500 to-blue-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-600/20 ring-1 ring-inset ring-white/20 transition hover:brightness-110 disabled:opacity-60">
                        Хадгалах
                    </button>
                </footer>
            </form>
        </div>
    );
}
