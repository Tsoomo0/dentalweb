import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';

interface RefundEntry {
    id: number;
    date: string;
    branch: string | null;
    patient_name: string | null;
    diagnosis: string | null;
    appointment_number: string | null;
    refund_amount: number;
    refund_method: string | null;
    refund_reason: string | null;
    refunded_at: string | null;
    doctor_name: string | null;
    receptionist_name: string | null;
}
interface Branch { id: number; name: string }
type Mode = 'day' | 'week' | 'month' | 'all';
interface Filters { branchId: string | null; mode: Mode; date: string; month: string }
interface Props { entries: RefundEntry[]; branches: Branch[]; filters: Filters; totalSelected: number }

const METHOD_LABELS: Record<string, string> = {
    bank: 'Данс', mobile: 'Мобайл', cash: 'Бэлэн', storepay: 'Storepay', card: 'Карт',
};
const MONTHS_MN = ['1','2','3','4','5','6','7','8','9','10','11','12'];

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Буцаалт', href: '/admin/refunds' },
];

function fmtDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function addDays(d: string, n: number) { const dt = new Date(d+'T00:00:00'); dt.setDate(dt.getDate()+n); return fmtDate(dt); }
function addMonths(m: string, n: number) {
    const [y, mo] = m.split('-').map(Number);
    const dt = new Date(y, mo - 1 + n, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}
function dateLabelMn(d: string) {
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getFullYear()} оны ${MONTHS_MN[dt.getMonth()]}-р сарын ${dt.getDate()}`;
}
function monthLabelMn(m: string) {
    const [y, mo] = m.split('-').map(Number);
    return `${y} оны ${MONTHS_MN[mo - 1]}-р сар`;
}
function weekLabelMn(d: string) {
    const end = new Date(d + 'T00:00:00');
    const start = new Date(d + 'T00:00:00'); start.setDate(start.getDate() - 6);
    const f = (dt: Date) => `${MONTHS_MN[dt.getMonth()]}-р сарын ${dt.getDate()}`;
    return `${f(start)} – ${f(end)}`;
}

function go(patch: Partial<Filters>, current: Filters) {
    router.get('/admin/refunds', {
        branchId: patch.branchId ?? current.branchId ?? '',
        mode:     patch.mode     ?? current.mode,
        date:     patch.date     ?? current.date,
        month:    patch.month    ?? current.month,
    }, { preserveState: false });
}

export default function AdminRefundsIndex({ entries, branches, filters, totalSelected }: Props) {
    const today     = fmtDate(new Date());
    const thisMonth = today.slice(0, 7);

    const label = filters.mode === 'day'   ? dateLabelMn(filters.date)
                : filters.mode === 'week'  ? weekLabelMn(filters.date)
                : filters.mode === 'month' ? monthLabelMn(filters.month)
                : 'Бүх цаг үе';
    const MODES: { key: Mode; label: string }[] = [
        { key: 'day',   label: 'Өдөр'    },
        { key: 'week',  label: '7 хоног' },
        { key: 'month', label: 'Сар'     },
        { key: 'all',   label: 'Бүгд'    },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Буцаалт" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <Undo2 className="size-5 text-red-600" />
                            <h1 className="text-lg font-bold text-foreground">Буцаалт</h1>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Сонгосон хугацаанд нийт <strong className="text-red-600 dark:text-red-400">{totalSelected.toLocaleString()}₮</strong> буцаагдсан
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select value={filters.branchId ?? ''}
                        onChange={e => go({ branchId: e.target.value || null }, filters)}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-background px-3 py-1.5 text-sm text-foreground">
                        <option value="">Бүх салбар</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {MODES.map(t => (
                            <button key={t.key} onClick={() => go({ mode: t.key }, filters)}
                                className={`px-3 py-1.5 text-sm font-semibold ${
                                    filters.mode === t.key
                                        ? 'bg-red-600 text-white'
                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {filters.mode !== 'all' && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5">
                            <button onClick={() => filters.mode === 'month'
                                ? go({ month: addMonths(filters.month, -1) }, filters)
                                : go({ date: addDays(filters.date, filters.mode === 'week' ? -7 : -1) }, filters)
                            } className="rounded p-1 text-muted-foreground hover:bg-muted">
                                <ChevronLeft className="size-4" />
                            </button>
                            <span className="text-xs font-semibold min-w-44 text-center">{label}</span>
                            <button onClick={() => filters.mode === 'month'
                                ? go({ month: addMonths(filters.month, 1) }, filters)
                                : go({ date: addDays(filters.date, filters.mode === 'week' ? 7 : 1) }, filters)
                            } className="rounded p-1 text-muted-foreground hover:bg-muted">
                                <ChevronRight className="size-4" />
                            </button>
                            <button onClick={() => go(filters.mode === 'month' ? { month: thisMonth } : { date: today }, filters)}
                                className="rounded px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                Өнөөдөр
                            </button>
                        </div>
                    )}
                </div>

                {entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-muted-foreground">
                        <Undo2 className="size-12 opacity-40 mb-3" />
                        <p className="text-sm">Буцаалт байхгүй</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-red-200 dark:border-red-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse" style={{ minWidth: 900 }}>
                                <thead>
                                    <tr className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-[10.5px] uppercase tracking-wide">
                                        <th className="border-b px-3 py-2.5 text-left">Огноо</th>
                                        <th className="border-b px-3 py-2.5 text-left">Салбар</th>
                                        <th className="border-b px-3 py-2.5 text-left">Өвчтөн</th>
                                        <th className="border-b px-3 py-2.5 text-left">Оношилгоо</th>
                                        <th className="border-b px-3 py-2.5 text-left">Баримт №</th>
                                        <th className="border-b px-3 py-2.5 text-right">Буцаасан дүн</th>
                                        <th className="border-b px-3 py-2.5 text-left">Хэлбэр</th>
                                        <th className="border-b px-3 py-2.5 text-left">Шалтгаан</th>
                                        <th className="border-b px-3 py-2.5 text-left">Огноо/цаг</th>
                                        <th className="border-b px-3 py-2.5 text-left">Эмч</th>
                                        <th className="border-b px-3 py-2.5 text-left">Ресепшн</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((e, idx) => (
                                        <tr key={e.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-red-50/30 dark:bg-red-900/5'}>
                                            <td className="border-b px-3 py-2.5 whitespace-nowrap text-gray-600 dark:text-gray-300">{e.date}</td>
                                            <td className="border-b px-3 py-2.5 text-gray-500">{e.branch ?? '—'}</td>
                                            <td className="border-b px-3 py-2.5 font-semibold text-foreground">{e.patient_name ?? '—'}</td>
                                            <td className="border-b px-3 py-2.5 text-gray-500 max-w-36 truncate">{e.diagnosis ?? '—'}</td>
                                            <td className="border-b px-3 py-2.5 font-mono text-gray-500">{e.appointment_number ?? '—'}</td>
                                            <td className="border-b px-3 py-2.5 text-right font-bold tabular-nums text-red-600 dark:text-red-400">−{e.refund_amount.toLocaleString()}₮</td>
                                            <td className="border-b px-3 py-2.5 text-gray-600">{e.refund_method ? METHOD_LABELS[e.refund_method] ?? e.refund_method : '—'}</td>
                                            <td className="border-b px-3 py-2.5 text-gray-500 max-w-40 truncate" title={e.refund_reason ?? ''}>{e.refund_reason ?? '—'}</td>
                                            <td className="border-b px-3 py-2.5 text-gray-500 whitespace-nowrap">{e.refunded_at ?? '—'}</td>
                                            <td className="border-b px-3 py-2.5 text-gray-500">{e.doctor_name ?? '—'}</td>
                                            <td className="border-b px-3 py-2.5 text-gray-500">{e.receptionist_name ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
