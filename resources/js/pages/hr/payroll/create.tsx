import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Building2, CalendarDays, ChevronRight, Save } from 'lucide-react';

interface Branch { id: number; name: string }
interface Props  { branches: Branch[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/employees' },
    { title: 'Цалингийн тооцоо', href: '/hr/payroll' },
    { title: 'Шинэ тооцоо', href: '/hr/payroll/create' },
];

const MONTHS = [
    { v: 1, l: '1-р сар' }, { v: 2, l: '2-р сар' }, { v: 3, l: '3-р сар' },
    { v: 4, l: '4-р сар' }, { v: 5, l: '5-р сар' }, { v: 6, l: '6-р сар' },
    { v: 7, l: '7-р сар' }, { v: 8, l: '8-р сар' }, { v: 9, l: '9-р сар' },
    { v: 10, l: '10-р сар' }, { v: 11, l: '11-р сар' }, { v: 12, l: '12-р сар' },
];

export default function CreatePayroll({ branches }: Props) {
    const now = new Date();
    const { data, setData, post, processing, errors } = useForm({
        year:      now.getFullYear(),
        month:     now.getMonth() + 1,
        half:      'second' as 'first' | 'second',
        branch_id: '' as string | number,
        notes:     '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/hr/payroll');
    }

    const selectedBranch = branches.find(b => b.id == data.branch_id);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Шинэ цалингийн тооцоо" />

            <div className="flex flex-col gap-5 p-4 md:p-6 max-w-lg">

                <div>
                    <h1 className="text-xl font-bold text-foreground">Шинэ цалингийн тооцоо</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Сонгосон салбарын идэвхтэй ажилтнуудаар автоматаар мөр үүснэ
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">

                    {/* ── Хугацаа ──────────────────────────────────────────── */}
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-muted/20">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
                                <CalendarDays className="size-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">Хугацаа</p>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Он + Сар */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                        Он <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number" min={2020} max={2100}
                                        value={data.year}
                                        onChange={e => setData('year', Number(e.target.value))}
                                        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    {errors.year && <p className="mt-1 text-xs text-red-500">{errors.year}</p>}
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                        Сар <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.month}
                                        onChange={e => setData('month', Number(e.target.value))}
                                        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                        {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Хагас */}
                            <div>
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                                    Хагас <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { v: 'first',  l: 'Эхний цалин',  sub: '1 – 15-ний хооронд',  color: 'border-sky-400 bg-sky-50/60 dark:bg-sky-950/20' },
                                        { v: 'second', l: 'Сүүл цалин',   sub: '16 – 31-ний хооронд', color: 'border-violet-400 bg-violet-50/60 dark:bg-violet-950/20' },
                                    ].map(opt => (
                                        <button
                                            key={opt.v} type="button"
                                            onClick={() => setData('half', opt.v as 'first' | 'second')}
                                            className={`relative rounded-xl border-2 px-4 py-3 text-left text-sm transition-all ${
                                                data.half === opt.v
                                                    ? opt.color + ' shadow-sm'
                                                    : 'border-border text-muted-foreground hover:bg-muted'
                                            }`}>
                                            {data.half === opt.v && (
                                                <span className="absolute top-2 right-2 size-2 rounded-full bg-current opacity-60" />
                                            )}
                                            <p className="font-semibold text-sm">{opt.l}</p>
                                            <p className="text-[11px] opacity-60 mt-0.5">{opt.sub}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Салбар ───────────────────────────────────────────── */}
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-muted/20">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                                <Building2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">Салбар</p>
                        </div>

                        <div className="p-5 space-y-3">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                    Салбар сонгох <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.branch_id}
                                    onChange={e => setData('branch_id', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                    <option value="">— Салбар сонгоно уу —</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                {errors.branch_id && <p className="mt-1 text-xs text-red-500">{errors.branch_id}</p>}
                            </div>

                            {selectedBranch && (
                                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2.5">
                                    <ChevronRight className="size-3.5 text-emerald-500 shrink-0" />
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                        <strong>{selectedBranch.name}</strong> салбарын идэвхтэй ажилтнуудын мөр үүснэ
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Тэмдэглэл ────────────────────────────────────────── */}
                    <div className="rounded-2xl border bg-card shadow-sm px-5 py-4">
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Тэмдэглэл</label>
                        <textarea
                            rows={2}
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                            placeholder="Нэмэлт тэмдэглэл..."
                            className="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={processing || !data.branch_id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-bold text-background hover:opacity-90 disabled:opacity-40 transition-all">
                        {processing
                            ? <span className="size-4 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                            : <Save className="size-4" />}
                        Үүсгэх
                    </button>
                </form>
            </div>
        </AppLayout>
    );
}
