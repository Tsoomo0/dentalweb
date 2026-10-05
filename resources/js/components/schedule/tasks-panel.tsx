import axios from 'axios';
import { ChevronLeft, ChevronRight, ClipboardList, Save, Stethoscope, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/toast';
import { DOW_FULL, MONTHS, addDays, dowIndex, parseDS, todayDS, type Branch } from './types';

/**
 * "Өдрийн хийх зүйлс" — салбар бүрийн өдрийн даалгавар. Хариуцагчийг тухайн өдөр
 * хуваарьтай хүмүүсээс (эхэнд) сонгоно.
 */
interface TaskState { person_id: number | null; done: boolean; }
interface DayTasks { reception?: Record<string, TaskState>; nurse?: Record<string, TaskState>; }
interface Staff { id: number; name: string; position: string | null; working: boolean; }

export default function TasksPanel({ routeBase, branches, branchId: initialBranch, receptionTasks, nurseTasks }: {
    routeBase: string; branches: Branch[]; branchId: number | null;
    receptionTasks: Record<string, string>; nurseTasks: Record<string, string>;
}) {
    const [branchId, setBranchId] = useState<number | null>(initialBranch ?? branches[0]?.id ?? null);
    const [date, setDate] = useState(todayDS());
    const [tasks, setTasks] = useState<DayTasks>({});
    const [staff, setStaff] = useState<Staff[]>([]);
    const [dirty, setDirty] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!branchId) return;
        let alive = true;
        setLoading(true);
        axios.get(`${routeBase}/tasks`, { params: { branch_id: branchId, date } })
            .then(r => { if (alive) { setTasks(Array.isArray(r.data.tasks) ? {} : r.data.tasks); setStaff(r.data.staff); setDirty(false); } })
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [routeBase, branchId, date]);

    const get = (g: 'reception' | 'nurse', k: string): TaskState => tasks[g]?.[k] ?? { person_id: null, done: false };
    const set = (g: 'reception' | 'nurse', k: string, v: TaskState) => {
        setTasks(t => ({ ...t, [g]: { ...(t[g] ?? {}), [k]: v } }));
        setDirty(true);
    };

    const save = () => {
        axios.post(`${routeBase}/tasks`, { branch_id: branchId, date, tasks })
            .then(r => { setDirty(false); showToast('success', r.data.message); })
            .catch(() => showToast('error', 'Хадгалж чадсангүй.'));
    };

    const d = parseDS(date);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card px-3 py-2 shadow-sm">
                <ClipboardList className="size-4 text-amber-500" />
                <span className="text-sm font-black">Өдрийн хийх зүйлс</span>
                {branches.length > 1 && (
                    <select className="h-8 rounded-lg border bg-background px-2 text-xs" value={branchId ?? ''} onChange={e => setBranchId(Number(e.target.value))}>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                )}
                <div className="flex h-8 items-center rounded-lg border bg-background">
                    <button type="button" onClick={() => setDate(addDays(date, -1))} className="flex h-full w-8 items-center justify-center text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /></button>
                    <span className="min-w-[150px] text-center text-xs font-bold">{MONTHS[d.getMonth()]}ын {d.getDate()}, {DOW_FULL[dowIndex(date)]}</span>
                    <button type="button" onClick={() => setDate(addDays(date, 1))} className="flex h-full w-8 items-center justify-center text-muted-foreground hover:text-foreground"><ChevronRight className="size-4" /></button>
                </div>
                {date !== todayDS() && <button type="button" onClick={() => setDate(todayDS())} className="h-8 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted">Өнөөдөр</button>}
                {dirty && (
                    <button type="button" onClick={save} className="ml-auto flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">
                        <Save className="size-3.5" /> Хадгалах
                    </button>
                )}
            </div>

            <div className={`grid grid-cols-1 gap-3 lg:grid-cols-2 ${loading ? 'opacity-60' : ''}`}>
                <Checklist title="Ресепшний хийх зүйлс" icon={<Users className="size-3.5" />} items={receptionTasks} staff={staff}
                    get={k => get('reception', k)} set={(k, v) => set('reception', k, v)} />
                <Checklist title="Сувилагчийн хийх зүйлс" icon={<Stethoscope className="size-3.5" />} items={nurseTasks} staff={staff}
                    get={k => get('nurse', k)} set={(k, v) => set('nurse', k, v)} />
            </div>
        </div>
    );
}

function Checklist({ title, icon, items, staff, get, set }: {
    title: string; icon: React.ReactNode; items: Record<string, string>; staff: Staff[];
    get: (k: string) => TaskState; set: (k: string, v: TaskState) => void;
}) {
    const keys = Object.keys(items);
    const assigned = keys.filter(k => get(k).person_id != null).length;
    return (
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/50">{icon}</span>
                <p className="flex-1 text-sm font-bold">{title}</p>
                <span className="text-[11px] font-bold tabular-nums text-muted-foreground">{assigned}/{keys.length}</span>
            </div>
            <div className="space-y-1.5">
                {keys.map(k => {
                    const st = get(k);
                    return (
                        <div key={k} className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/50 px-2.5 py-1.5">
                            <input type="checkbox" checked={st.done} onChange={e => set(k, { ...st, done: e.target.checked })} className="size-4 rounded" title="Хийгдсэн" />
                            <span className={`flex-1 text-xs leading-snug ${st.done ? 'text-muted-foreground line-through' : 'font-medium'}`}>{items[k]}</span>
                            <select value={st.person_id ?? ''} onChange={e => set(k, { ...st, person_id: e.target.value ? Number(e.target.value) : null })}
                                className="h-7 w-32 shrink-0 rounded-lg border bg-background px-1.5 text-[11px]">
                                <option value="">— Хэн —</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.working ? '● ' : ''}{s.name}</option>)}
                            </select>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
