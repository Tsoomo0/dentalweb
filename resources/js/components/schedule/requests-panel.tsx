import { router } from '@inertiajs/react';
import { ArrowLeftRight, Ban, Check, X } from 'lucide-react';
import { DOW_SHORT, dowIndex, parseDS, type Branch } from './types';

/** HR: ээлж шилжүүлэх хүсэлтийн шийдвэр + ажилтнуудын "боломжгүй өдөр". */

export interface SwapItem {
    id: number; status: string; status_label: string; is_swap: boolean;
    requester: string | null; target: string | null;
    shift: { date: string; label: string } | null; target_shift: { date: string; label: string } | null;
    note: string | null; rejection_reason: string | null; created_at: string;
}
export interface AvailabilityItem { id: number; date: string; note: string | null; employee: string | null; branch_id: number | null; }

export default function RequestsPanel({ swaps, availability, branches }: {
    swaps: SwapItem[]; availability: AvailabilityItem[]; branches: Branch[];
}) {
    const decide = (s: SwapItem, approve: boolean) => {
        const reason = approve ? null : prompt('Татгалзах шалтгаан:');
        if (!approve && !reason) return;
        router.patch(`/hr/schedule/swaps/${s.id}`, { approve, reason }, { preserveScroll: true });
    };

    const pending = swaps.filter(s => s.status === 'pending_approval');
    const others = swaps.filter(s => s.status !== 'pending_approval');
    const branchName = (id: number | null) => branches.find(b => b.id === id)?.name ?? '';
    const dateLabel = (d: string) => `${parseDS(d).getMonth() + 1}/${parseDS(d).getDate()} ${DOW_SHORT[dowIndex(d)]}`;

    return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
            <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black"><ArrowLeftRight className="size-4 text-indigo-500" /> Ээлж шилжүүлэх хүсэлт</h2>
                {pending.length === 0 && others.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Хүсэлт алга.</p>}
                <div className="space-y-2">
                    {[...pending, ...others].map(s => (
                        <div key={s.id} className={`rounded-xl border p-3 ${s.status === 'pending_approval' ? 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20' : ''}`}>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-bold">{s.requester} <span className="text-muted-foreground">→</span> {s.target}</p>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{s.is_swap ? 'Солилцох' : 'Шилжүүлэх'}</span>
                                <span className="ml-auto text-[10px] text-muted-foreground">{s.created_at}</span>
                            </div>
                            <p className="mt-1 text-[11px]">{s.shift ? `${dateLabel(s.shift.date)} · ${s.shift.label}` : '—'}</p>
                            {s.target_shift && <p className="text-[11px] text-muted-foreground">Оронд нь: {dateLabel(s.target_shift.date)} · {s.target_shift.label}</p>}
                            {s.note && <p className="mt-1 text-[11px] italic text-muted-foreground">"{s.note}"</p>}
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`text-[10px] font-semibold ${s.status === 'approved' ? 'text-emerald-600' : s.status === 'rejected' || s.status === 'cancelled' ? 'text-rose-600' : 'text-amber-600'}`}>{s.status_label}</span>
                                {s.rejection_reason && <span className="text-[10px] text-muted-foreground">· {s.rejection_reason}</span>}
                                {s.status === 'pending_approval' && (
                                    <div className="ml-auto flex gap-1">
                                        <button type="button" onClick={() => decide(s, false)} className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-500/10"><X className="size-3.5" /> Татгалзах</button>
                                        <button type="button" onClick={() => decide(s, true)} className="flex h-7 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-[11px] font-semibold text-white hover:bg-emerald-700"><Check className="size-3.5" /> Батлах</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <h2 className="mb-1 flex items-center gap-2 text-sm font-black"><Ban className="size-4 text-rose-500" /> Боломжгүй өдрүүд</h2>
                <p className="mb-3 text-[11px] text-muted-foreground">Ажилтнууд My порталаас тэмдэглэсэн. Хуваарь дээр нүдний буланд улаан тэмдэг болж харагдана.</p>
                {availability.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Тэмдэглэл алга.</p>}
                <div className="divide-y divide-border/50">
                    {availability.map(a => (
                        <div key={a.id} className="flex items-center gap-2 py-1.5">
                            <span className="w-16 shrink-0 text-[11px] font-bold tabular-nums">{dateLabel(a.date)}</span>
                            <span className="min-w-0 flex-1 truncate text-xs font-medium">{a.employee}</span>
                            <span className="truncate text-[10px] text-muted-foreground">{branchName(a.branch_id)}{a.note ? ` · ${a.note}` : ''}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
