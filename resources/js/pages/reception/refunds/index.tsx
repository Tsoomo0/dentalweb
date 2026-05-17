import ReceptionLayout from '@/layouts/reception-layout';
import { shortDoctorName } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';

interface RefundEntry {
    id: number;
    patient_name: string | null;
    gender: string | null;
    diagnosis: string | null;
    appointment_number: string | null;
    refund_amount: number;
    refund_method: string | null;
    refund_reason: string | null;
    refunded_at: string | null;
    date: string;
    receptionist_name: string | null;
    doctor_name: string | null;
    is_mine: boolean;
}

type Mode = 'day' | 'week' | 'month' | 'all';

interface Filters { mode: Mode; date: string; month: string }
interface Props { entries: RefundEntry[]; filters: Filters; totalThisMonth: number }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/reception/dashboard' },
    { title: 'Буцаалт',         href: '/reception/refunds' },
];

const METHOD_LABELS: Record<string, string> = {
    bank: 'Данс', mobile: 'Мобайл', cash: 'Бэлэн', storepay: 'Storepay', card: 'Карт',
};
const MONTHS_MN = ['1','2','3','4','5','6','7','8','9','10','11','12'];

function fmtDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
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
    const p: Record<string, string> = {
        mode:  patch.mode  ?? current.mode,
        date:  patch.date  ?? current.date,
        month: patch.month ?? current.month,
    };
    router.get('/reception/refunds', p, { preserveScroll: false, preserveState: false });
}

export default function RefundsIndex({ entries, filters, totalThisMonth }: Props) {
    const today     = fmtDate(new Date());
    const thisMonth = today.slice(0, 7);

    const label = filters.mode === 'day'   ? dateLabelMn(filters.date)
                : filters.mode === 'week'  ? weekLabelMn(filters.date)
                : filters.mode === 'month' ? monthLabelMn(filters.month)
                : 'Бүх цаг үе';

    const totalSelected = entries.reduce((s, e) => s + e.refund_amount, 0);
    const MODES: { key: Mode; label: string }[] = [
        { key: 'day',   label: 'Өдөр'    },
        { key: 'week',  label: '7 хоног' },
        { key: 'month', label: 'Сар'     },
        { key: 'all',   label: 'Бүгд'    },
    ];

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Буцаалт" />

            <div className="flex flex-col gap-4 p-3 md:p-5">

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <Undo2 className="size-5 text-red-600" />
                            <h1 className="text-lg font-bold text-foreground">Буцаалт</h1>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Энэ сард нийт <strong className="text-red-600 dark:text-red-400">{totalThisMonth.toLocaleString()}₮</strong> буцаагдсан
                        </p>
                    </div>
                </div>

                {/* Mode tabs + period nav */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        {MODES.map(t => (
                            <button key={t.key} onClick={() => go({ mode: t.key }, filters)}
                                className={`px-3.5 py-2 text-sm font-semibold transition-colors ${
                                    filters.mode === t.key
                                        ? 'bg-red-600 text-white'
                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {filters.mode !== 'all' && (
                        <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm">
                            <button onClick={() => filters.mode === 'month'
                                ? go({ month: addMonths(filters.month, -1) }, filters)
                                : go({ date: addDays(filters.date, filters.mode === 'week' ? -7 : -1) }, filters)
                            } className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                                <ChevronLeft className="size-4" />
                            </button>
                            <span className="text-sm font-semibold min-w-48 text-center">{label}</span>
                            <button onClick={() => filters.mode === 'month'
                                ? go({ month: addMonths(filters.month, 1) }, filters)
                                : go({ date: addDays(filters.date, filters.mode === 'week' ? 7 : 1) }, filters)
                            } className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                                <ChevronRight className="size-4" />
                            </button>
                            <button onClick={() => go(filters.mode === 'month' ? { month: thisMonth } : { date: today }, filters)}
                                className="rounded-lg px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                Өнөөдөр
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                {entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-muted-foreground">
                        <Undo2 className="size-12 text-gray-400 opacity-60" />
                        <p className="text-sm font-semibold">Буцаалт байхгүй</p>
                    </div>
                ) : (
                    <div className="rounded-xl overflow-hidden border border-red-200 dark:border-red-800 shadow-sm">
                        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 px-4 py-2.5 border-b border-red-200 dark:border-red-800">
                            <span className="text-sm font-bold text-red-800 dark:text-red-300">Буцаалтын жагсаалт</span>
                            <span className="text-xs font-semibold text-red-700 dark:text-red-400 tabular-nums">
                                {entries.length} бичлэг · {totalSelected.toLocaleString()}₮
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse" style={{ minWidth: 780 }}>
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-[10.5px] uppercase tracking-wide">
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left">Анх огноо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left">Үйлчлүүлэгч</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left">Оношилгоо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left">Баримт №</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-right">Буцаасан дүн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left">Хэлбэр</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left">Шалтгаан</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left">Буцаасан огноо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left">Эмч</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left">Ресепшн</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((e, idx) => (
                                        <tr key={e.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-red-50/30 dark:bg-red-900/5'}>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{e.date}</td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5">
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{e.patient_name ?? '—'}</span>
                                                {e.gender && (
                                                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-semibold ${e.gender === 'Эр' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'}`}>
                                                        {e.gender}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500 max-w-36 truncate">{e.diagnosis ?? '—'}</td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 font-mono text-gray-500">{e.appointment_number ?? '—'}</td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-right font-bold tabular-nums text-red-600 dark:text-red-400 whitespace-nowrap">
                                                −{e.refund_amount.toLocaleString()}₮
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-600 dark:text-gray-300">
                                                {e.refund_method ? METHOD_LABELS[e.refund_method] ?? e.refund_method : '—'}
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500 max-w-40 truncate" title={e.refund_reason ?? ''}>{e.refund_reason ?? '—'}</td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500 whitespace-nowrap">{e.refunded_at ?? '—'}</td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500">{e.doctor_name ? shortDoctorName(e.doctor_name) : '—'}</td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500">{e.receptionist_name ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </ReceptionLayout>
    );
}
