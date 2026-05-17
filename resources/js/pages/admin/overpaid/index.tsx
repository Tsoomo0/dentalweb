import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Clock, TrendingUp } from 'lucide-react';

interface OverpaidEntry {
    id: number;
    date: string;
    branch: string | null;
    patient_name: string | null;
    diagnosis: string | null;
    appointment_number: string | null;
    overpaid_amount: number;
    overpaid_used_at: string | null;
    overpaid_used_receipt: string | null;
    overpaid_used_method: string | null;
    overpaid_used_amount: number | null;
    doctor_name: string | null;
    receptionist_name: string | null;
}
interface Branch { id: number; name: string }
interface Filters { branchId: string | null; tab: 'all' | 'pending' | 'used' }
interface Props { entries: OverpaidEntry[]; branches: Branch[]; filters: Filters }

const METHOD_LABELS: Record<string, string> = {
    mobile: 'Мобайл', card: 'Карт', cash: 'Бэлэн', storepay: 'Storepay',
};
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Илүү тооцоо', href: '/admin/overpaid' },
];

function go(patch: Partial<Filters>, current: Filters) {
    router.get('/admin/overpaid', {
        branchId: patch.branchId ?? current.branchId ?? '',
        tab:      patch.tab      ?? current.tab,
    }, { preserveState: false });
}

export default function AdminOverpaidIndex({ entries, branches, filters }: Props) {
    const pending = entries.filter(e => !e.overpaid_used_at);
    const used    = entries.filter(e => !!e.overpaid_used_at);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Илүү тооцоо" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <div className="flex items-center gap-2">
                    <TrendingUp className="size-5 text-green-600" />
                    <h1 className="text-lg font-bold text-foreground">Илүү тооцоо</h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select value={filters.branchId ?? ''}
                        onChange={e => go({ branchId: e.target.value || null }, filters)}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-background px-3 py-1.5 text-sm text-foreground">
                        <option value="">Бүх салбар</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {(['all', 'pending', 'used'] as const).map(t => (
                            <button key={t} onClick={() => go({ tab: t }, filters)}
                                className={`px-3 py-1.5 text-sm font-semibold ${
                                    filters.tab === t
                                        ? 'bg-green-600 text-white'
                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}>
                                {t === 'all' ? `Бүгд (${entries.length})` : t === 'pending' ? `Хүлээгдэж буй (${pending.length})` : `Ашигласан (${used.length})`}
                            </button>
                        ))}
                    </div>
                </div>

                {entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-muted-foreground">
                        <TrendingUp className="size-12 opacity-40 mb-3" />
                        <p className="text-sm">Илүү тооцоо байхгүй</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-green-200 dark:border-green-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse" style={{ minWidth: 900 }}>
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-[10.5px] uppercase tracking-wide">
                                        <th className="border-b px-3 py-2.5 text-left">Огноо</th>
                                        <th className="border-b px-3 py-2.5 text-left">Салбар</th>
                                        <th className="border-b px-3 py-2.5 text-left">Өвчтөн</th>
                                        <th className="border-b px-3 py-2.5 text-left">Оношилгоо</th>
                                        <th className="border-b px-3 py-2.5 text-left">Баримт№</th>
                                        <th className="border-b px-3 py-2.5 text-right">Илүү дүн</th>
                                        <th className="border-b px-3 py-2.5 text-left">Төлөв</th>
                                        <th className="border-b px-3 py-2.5 text-left">Ашигласан баримт</th>
                                        <th className="border-b px-3 py-2.5 text-left">Хэлбэр</th>
                                        <th className="border-b px-3 py-2.5 text-left">Эмч</th>
                                        <th className="border-b px-3 py-2.5 text-left">Ресепшн</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((e, idx) => (
                                        <tr key={e.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/15'}>
                                            <td className="border-b px-3 py-2.5 whitespace-nowrap text-gray-600 dark:text-gray-300">{e.date}</td>
                                            <td className="border-b px-3 py-2.5 text-gray-500">{e.branch ?? '—'}</td>
                                            <td className="border-b px-3 py-2.5 font-semibold text-foreground">{e.patient_name ?? '—'}</td>
                                            <td className="border-b px-3 py-2.5 text-gray-500 max-w-40 truncate">{e.diagnosis ?? '—'}</td>
                                            <td className="border-b px-3 py-2.5 font-mono text-gray-500">{e.appointment_number ?? '—'}</td>
                                            <td className="border-b px-3 py-2.5 text-right font-bold tabular-nums text-green-700 dark:text-green-400">+{e.overpaid_amount.toLocaleString()}₮</td>
                                            <td className="border-b px-3 py-2.5">
                                                {e.overpaid_used_at ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-400">
                                                        <CheckCircle2 className="size-3" /> Ашигласан
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">
                                                        <Clock className="size-3" /> Хүлээгдэж буй
                                                    </span>
                                                )}
                                            </td>
                                            <td className="border-b px-3 py-2.5 font-mono text-gray-500">{e.overpaid_used_receipt ?? '—'}</td>
                                            <td className="border-b px-3 py-2.5 text-gray-600">{e.overpaid_used_method ? METHOD_LABELS[e.overpaid_used_method] ?? e.overpaid_used_method : '—'}</td>
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
