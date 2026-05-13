import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface OrthoRecord {
    id: number; doctor_id: number;
    archive_code: string | null; card_number: string | null;
    register_number: string | null; last_name: string; first_name: string;
    phone: string | null; attached_date: string | null; removed_date: string | null;
    notes: string | null; is_active: boolean;
}
interface DoctorData {
    id: number; name: string; specialization: string | null;
    records: OrthoRecord[];
}
interface Props { doctors: DoctorData[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Ортодонт бүртгэл', href: '/admin/ortho-appliances' },
];

const thCls = "px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap";

export default function AdminOrthoAppliances({ doctors }: Props) {
    const [activeTab, setActiveTab] = useState(doctors[0]?.id ?? null);

    const doctor  = doctors.find(d => d.id === activeTab);
    const active  = doctor?.records.filter(r => r.is_active)  ?? [];
    const removed = doctor?.records.filter(r => !r.is_active) ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ортодонт бүртгэл" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-lg font-bold text-foreground">Ортодонтийн аппарат бүртгэл</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Гажиг заслын эмч нарын аппарат бүртгэл — харах горим</p>
                </div>

                {doctors.length === 0 ? (
                    <div className="rounded-2xl border bg-card p-12 text-center">
                        <p className="text-sm text-muted-foreground">Гажиг заслын их эмч олдсонгүй.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {doctors.map(d => (
                                <button key={d.id} onClick={() => setActiveTab(d.id)}
                                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                                        activeTab === d.id
                                            ? 'bg-red-600 text-white shadow-sm'
                                            : 'border bg-card text-foreground hover:bg-muted'
                                    }`}>
                                    {d.name}
                                    <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                        activeTab === d.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {d.records.filter(r => r.is_active).length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {doctor && (
                            <div className="space-y-5">
                                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 border-b bg-amber-50/50 dark:bg-amber-950/10">
                                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Аппарат зүүсэн — идэвхтэй ({active.length})</p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b bg-muted/20">
                                                    <th className={thCls}>#</th>
                                                    <th className={thCls}>Архив Код</th>
                                                    <th className={thCls}>Картны №</th>
                                                    <th className={thCls}>РД</th>
                                                    <th className={thCls}>Овог</th>
                                                    <th className={thCls}>Нэр</th>
                                                    <th className={thCls}>Утас</th>
                                                    <th className={thCls}>Зүүсэн өдөр</th>
                                                    <th className={thCls}>Тэмдэглэл</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/40">
                                                {active.length === 0 ? (
                                                    <tr><td colSpan={9} className="px-4 py-6 text-center text-xs text-muted-foreground">Бичлэг байхгүй</td></tr>
                                                ) : active.map((r, i) => (
                                                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                                                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                                        <td className="px-3 py-2">{r.archive_code || '—'}</td>
                                                        <td className="px-3 py-2 font-mono">{r.card_number || '—'}</td>
                                                        <td className="px-3 py-2 font-mono text-muted-foreground">{r.register_number || '—'}</td>
                                                        <td className="px-3 py-2 font-semibold">{r.last_name}</td>
                                                        <td className="px-3 py-2">{r.first_name}</td>
                                                        <td className="px-3 py-2">{r.phone || '—'}</td>
                                                        <td className="px-3 py-2">{r.attached_date || '—'}</td>
                                                        <td className="px-3 py-2 max-w-[150px] truncate text-muted-foreground">{r.notes || ''}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {removed.length > 0 && (
                                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                        <div className="px-4 py-3 border-b bg-emerald-50/50 dark:bg-emerald-950/10">
                                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Аппарат салгасан — дууссан ({removed.length})</p>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse text-xs">
                                                <thead>
                                                    <tr className="border-b bg-muted/20">
                                                        <th className={thCls}>#</th>
                                                        <th className={thCls}>Архив Код</th>
                                                        <th className={thCls}>Картны №</th>
                                                        <th className={thCls}>РД</th>
                                                        <th className={thCls}>Овог</th>
                                                        <th className={thCls}>Нэр</th>
                                                        <th className={thCls}>Утас</th>
                                                        <th className={thCls}>Зүүсэн өдөр</th>
                                                        <th className={thCls}>Салгасан өдөр</th>
                                                        <th className={thCls}>Тэмдэглэл</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/40">
                                                    {removed.map((r, i) => (
                                                        <tr key={r.id} className="opacity-70 hover:bg-muted/20 transition-colors">
                                                            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                                            <td className="px-3 py-2">{r.archive_code || '—'}</td>
                                                            <td className="px-3 py-2 font-mono">{r.card_number || '—'}</td>
                                                            <td className="px-3 py-2 font-mono text-muted-foreground">{r.register_number || '—'}</td>
                                                            <td className="px-3 py-2 font-semibold">{r.last_name}</td>
                                                            <td className="px-3 py-2">{r.first_name}</td>
                                                            <td className="px-3 py-2">{r.phone || '—'}</td>
                                                            <td className="px-3 py-2">{r.attached_date || '—'}</td>
                                                            <td className="px-3 py-2">
                                                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                                    {r.removed_date}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 max-w-[150px] truncate text-muted-foreground">{r.notes || ''}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
