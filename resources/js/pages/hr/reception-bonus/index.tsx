import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Building2, CalendarDays, CheckCircle2, ChevronRight,
    Clock, Plus, Save, Send, Star, Trash2, X,
} from 'lucide-react';
import { useState } from 'react';

interface BonusRun {
    id: number; title: string; year: number; month: number;
    half: 'first' | 'second'; half_label: string; label: string | null;
    status: 'draft' | 'final'; entries_count: number; sent_entries_count: number;
    created_at: string; created_by: string | null;
}
interface Branch { id: number; name: string }
interface Props { runs: BonusRun[]; branches: Branch[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/employees' },
    { title: 'Ресепшний урамшуулал', href: '/hr/reception-bonus' },
];

const MONTHS = [
    { v:1,l:'1-р сар'},{v:2,l:'2-р сар'},{v:3,l:'3-р сар'},{v:4,l:'4-р сар'},
    {v:5,l:'5-р сар'},{v:6,l:'6-р сар'},{v:7,l:'7-р сар'},{v:8,l:'8-р сар'},
    {v:9,l:'9-р сар'},{v:10,l:'10-р сар'},{v:11,l:'11-р сар'},{v:12,l:'12-р сар'},
];

function StatusBadge({ run }: { run: BonusRun }) {
    if (run.status === 'final') return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="size-3" /> Баталгаажсан
        </span>
    );
    if (run.sent_entries_count > 0 && run.sent_entries_count < run.entries_count) return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
            <Send className="size-3" /> {run.sent_entries_count}/{run.entries_count} илгээсэн
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <Clock className="size-3" /> Ноорог
        </span>
    );
}

function CreateForm({ branches, onClose }: { branches: Branch[]; onClose: () => void }) {
    const now = new Date();
    const form = useForm({
        year: now.getFullYear(), month: now.getMonth() + 1,
        half: 'second' as 'first'|'second', branch_id: '' as string|number, notes: '',
    });
    const selectedBranch = branches.find(b => b.id == form.data.branch_id);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/hr/reception-bonus', { onSuccess: onClose });
    }

    return (
        <form onSubmit={submit}>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950/40">
                            <CalendarDays className="size-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Хугацаа</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-zinc-400">Он *</label>
                            <input type="number" min={2020} max={2100} value={form.data.year}
                                onChange={e => form.setData('year', Number(e.target.value))}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-zinc-400">Сар *</label>
                            <select value={form.data.month} onChange={e => form.setData('month', Number(e.target.value))}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { v:'first',  l:'Сарын эхэн', sub:'1–15-ний хооронд',  active:'border-sky-400 bg-sky-50/60 dark:bg-sky-950/20' },
                            { v:'second', l:'Сарын сүүл', sub:'16–31-ний хооронд', active:'border-violet-400 bg-violet-50/60 dark:bg-violet-950/20' },
                        ].map(opt => (
                            <button key={opt.v} type="button"
                                onClick={() => form.setData('half', opt.v as 'first'|'second')}
                                className={`relative rounded-xl border-2 px-4 py-2.5 text-left transition-all ${
                                    form.data.half === opt.v ? opt.active + ' shadow-sm' : 'border-border text-muted-foreground hover:bg-muted'
                                }`}>
                                {form.data.half === opt.v && <span className="absolute top-2 right-2 size-1.5 rounded-full bg-current opacity-60" />}
                                <p className="font-semibold text-sm">{opt.l}</p>
                                <p className="text-[11px] opacity-60 mt-0.5">{opt.sub}</p>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="border-t border-gray-100 dark:border-zinc-800" />
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950/40">
                            <Building2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Салбар</p>
                    </div>
                    <select value={form.data.branch_id} onChange={e => form.setData('branch_id', e.target.value)}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">— Салбар сонгоно уу —</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {form.errors.branch_id && <p className="text-xs text-red-500">{form.errors.branch_id}</p>}
                    {selectedBranch && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
                            <ChevronRight className="size-3 text-emerald-500 shrink-0" />
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                <strong>{selectedBranch.name}</strong> салбарын ресепшн ажилтнуудын мөр үүснэ
                            </p>
                        </div>
                    )}
                </div>
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-zinc-400">Тэмдэглэл</label>
                    <textarea rows={2} value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                        placeholder="Нэмэлт тэмдэглэл..."
                        className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40" />
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30">
                <button type="button" onClick={onClose}
                    className="rounded-xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                    Болих
                </button>
                <button type="submit" disabled={form.processing || !form.data.branch_id}
                    className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 transition-all">
                    {form.processing
                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        : <Save className="size-4" />}
                    Үүсгэх
                </button>
            </div>
        </form>
    );
}

export default function ReceptionBonusIndex({ runs, branches }: Props) {
    const [delId, setDelId]         = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    function confirmDelete(id: number) {
        router.delete(`/hr/reception-bonus/${id}`, { onSuccess: () => setDelId(null) });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ресепшний урамшуулал" />

            {/* ════ MOBILE ════ */}
            <div className="md:hidden min-h-full bg-[#f2f2f7] dark:bg-zinc-950">
                <div className="px-4 pt-6 pb-24">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 px-1 mb-3">
                        Ресепшний урамшуулал
                    </p>
                    {runs.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 bg-white dark:bg-zinc-900 rounded-2xl" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                            <Star className="size-10 text-gray-200 dark:text-zinc-700" />
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Урамшуулал байхгүй байна</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                            {runs.map(r => (
                                <div key={r.id} className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-zinc-800 transition-colors cursor-pointer"
                                    onClick={() => router.visit(`/hr/reception-bonus/${r.id}`)}>
                                    <div className="size-10 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                                        <Star className="size-5 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{r.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <StatusBadge run={r} />
                                            <span className="text-xs text-gray-400 dark:text-zinc-500">{r.entries_count} ажилтан</span>
                                        </div>
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); setDelId(r.id); }}
                                        className="size-8 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                                        <Trash2 className="size-4 text-red-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FAB */}
                <button onClick={() => setCreateOpen(true)}
                    className="fixed bottom-6 right-5 flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg active:scale-95 transition-transform z-40">
                    <Plus className="size-5" /> Шинэ тооцоо
                </button>
            </div>

            {/* ════ DESKTOP ════ */}
            <div className="hidden md:flex flex-col gap-5 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Ресепшний урамшуулал</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Сард 2 удаа урамшуулал бүртгэх</p>
                    </div>
                    <button onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors">
                        <Plus className="size-4" /> Шинэ тооцоо
                    </button>
                </div>
                {runs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card py-20 text-center">
                        <p className="text-sm text-muted-foreground">Урамшуулал байхгүй байна</p>
                        <button onClick={() => setCreateOpen(true)} className="mt-4 text-xs text-primary underline">Шинэ тооцоо үүсгэх</button>
                    </div>
                ) : (
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    <th className="px-5 py-3 text-left">Гарчиг</th>
                                    <th className="px-4 py-3 text-left hidden sm:table-cell">Статус</th>
                                    <th className="px-4 py-3 text-center hidden md:table-cell">Ажилтан</th>
                                    <th className="px-4 py-3 text-left hidden lg:table-cell">Огноо</th>
                                    <th className="px-4 py-3 text-right">Үйлдэл</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {runs.map(r => (
                                    <tr key={r.id} className="group hover:bg-muted/20 transition-colors cursor-pointer"
                                        onClick={() => router.visit(`/hr/reception-bonus/${r.id}`)}>
                                        <td className="px-5 py-3.5">
                                            <p className="font-semibold text-foreground text-sm">{r.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{r.half === 'first' ? '1–15' : '16–31'}</p>
                                        </td>
                                        <td className="px-4 py-3.5 hidden sm:table-cell"><StatusBadge run={r} /></td>
                                        <td className="px-4 py-3.5 text-center hidden md:table-cell">
                                            <span className="text-xs font-medium">{r.entries_count}</span>
                                            <span className="text-xs text-muted-foreground"> ажилтан</span>
                                        </td>
                                        <td className="px-4 py-3.5 hidden lg:table-cell">
                                            <p className="text-xs text-muted-foreground">{r.created_at}</p>
                                        </td>
                                        <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => setDelId(r.id)}
                                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create bottom sheet */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4"
                    onClick={() => setCreateOpen(false)}>
                    <div className="w-full md:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="md:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                        </div>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Шинэ урамшууллын тооцоо</h2>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Ресепшн ажилтнуудаар автоматаар мөр үүснэ</p>
                            </div>
                            <button onClick={() => setCreateOpen(false)}
                                className="size-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                <X className="size-4 text-gray-500" />
                            </button>
                        </div>
                        <CreateForm branches={branches} onClose={() => setCreateOpen(false)} />
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {delId !== null && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4"
                    onClick={() => setDelId(null)}>
                    <div className="w-full md:max-w-xs bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl shadow-2xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="md:hidden flex justify-center mb-2">
                            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Устгах уу?</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">Устгасан тооцоог сэргээх боломжгүй.</p>
                        <div className="flex gap-2">
                            <button onClick={() => confirmDelete(delId)}
                                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white active:scale-[0.98] transition-transform">
                                Устгах
                            </button>
                            <button onClick={() => setDelId(null)}
                                className="flex-1 rounded-2xl bg-gray-100 dark:bg-zinc-800 py-3 text-sm font-semibold text-gray-600 dark:text-zinc-300 active:scale-[0.98] transition-transform">
                                Болих
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
