import AppLayout from '@/layouts/app-layout';
import { shortDoctorName } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface OrthoRecord {
    id: number;
    doctor_id: number;
    appliance_type: 'removable' | 'fixed';
    archive_code: string;
    card_number: string;
    register_number: string;
    last_name: string;
    first_name: string;
    phone: string;
    attached_date: string;
    removed_date: string;
    notes: string;
    is_active: boolean;
}

interface DoctorData {
    id: number;
    name: string;
    specialization: string | null;
    records: OrthoRecord[];
}

interface Props { doctors: DoctorData[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Ортодонт бүртгэл', href: '/admin/ortho-appliances' },
];

const thCls = "px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap";

function TypeTable({ type, records }: { type: 'removable' | 'fixed'; records: OrthoRecord[] }) {
    const rows      = records.filter(r => r.appliance_type === type);
    const active    = rows.filter(r => r.is_active);
    const done      = rows.filter(r => !r.is_active);
    const isRem     = type === 'removable';

    const hdrColor  = isRem
        ? 'bg-sky-50/60 dark:bg-sky-950/15 border-sky-200/60 dark:border-sky-800/30'
        : 'bg-violet-50/60 dark:bg-violet-950/15 border-violet-200/60 dark:border-violet-800/30';
    const hdrText   = isRem ? 'text-sky-700 dark:text-sky-400' : 'text-violet-700 dark:text-violet-400';
    const badge     = isRem
        ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400'
        : 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400';
    const label     = isRem ? 'Авагддаг аппарат' : 'Авагддаггүй аппарат';

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${hdrColor}`}>
                <span className={`text-sm font-bold ${hdrText}`}>{label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge}`}>
                    {active.length} идэвхтэй
                </span>
                {done.length > 0 && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                        {done.length} дууссан
                    </span>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                    <thead>
                        <tr className="border-b bg-muted/20">
                            <th className={thCls}>#</th>
                            <th className={thCls}>Архив</th>
                            <th className={thCls}>Карт №</th>
                            <th className={thCls}>РД</th>
                            <th className={thCls}>Овог</th>
                            <th className={thCls}>Нэр</th>
                            <th className={thCls}>Утас</th>
                            <th className={thCls}>Зүүсэн</th>
                            <th className={thCls}>Салгасан</th>
                            <th className={thCls}>Тэмдэглэл</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-5 text-center text-xs text-muted-foreground">Бичлэг байхгүй</td>
                            </tr>
                        ) : rows.map((r, i) => (
                            <tr key={r.id} className={`hover:bg-muted/20 transition-colors ${!r.is_active ? 'opacity-60' : ''}`}>
                                <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                                <td className="px-2 py-1.5">{r.archive_code || '—'}</td>
                                <td className="px-2 py-1.5 font-mono">{r.card_number || '—'}</td>
                                <td className="px-2 py-1.5 font-mono text-muted-foreground">{r.register_number || '—'}</td>
                                <td className="px-2 py-1.5 font-semibold">{r.last_name}</td>
                                <td className="px-2 py-1.5">{r.first_name}</td>
                                <td className="px-2 py-1.5">{r.phone || '—'}</td>
                                <td className="px-2 py-1.5 whitespace-nowrap">{r.attached_date || '—'}</td>
                                <td className="px-2 py-1.5 whitespace-nowrap">
                                    {r.removed_date ? (
                                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                            {r.removed_date}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                            Идэвхтэй
                                        </span>
                                    )}
                                </td>
                                <td className="px-2 py-1.5 max-w-[140px] truncate text-muted-foreground">{r.notes || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function AdminOrthoAppliances({ doctors }: Props) {
    const [activeTab, setActiveTab] = useState<number | 'all'>(doctors[0]?.id ?? 'all');
    const totalActive = doctors.reduce((s, d) => s + d.records.filter(r => r.is_active).length, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ортодонт бүртгэл" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-lg font-bold text-foreground">Ортодонтийн аппарат бүртгэл</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Гажиг заслын эмч нарын аппарат бүртгэл — нийт <strong>{totalActive}</strong> идэвхтэй
                    </p>
                </div>

                {doctors.length === 0 ? (
                    <div className="rounded-2xl border bg-card p-12 text-center">
                        <p className="text-sm text-muted-foreground">Гажиг заслын их эмч олдсонгүй.</p>
                    </div>
                ) : (
                    <>
                        {/* Tab bar */}
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                                    activeTab === 'all'
                                        ? 'bg-zinc-800 text-white shadow-sm dark:bg-zinc-200 dark:text-zinc-900'
                                        : 'border bg-card text-foreground hover:bg-muted'
                                }`}>
                                Бүгд
                                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                    activeTab === 'all' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900' : 'bg-muted text-muted-foreground'
                                }`}>
                                    {totalActive}
                                </span>
                            </button>

                            {doctors.map(d => {
                                const cnt = d.records.filter(r => r.is_active).length;
                                return (
                                    <button key={d.id} onClick={() => setActiveTab(d.id)}
                                        className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                                            activeTab === d.id
                                                ? 'bg-red-600 text-white shadow-sm'
                                                : 'border bg-card text-foreground hover:bg-muted'
                                        }`}>
                                        {shortDoctorName(d.name)}
                                        <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                            activeTab === d.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {cnt}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content */}
                        {activeTab === 'all' ? (
                            <AllDoctorsView doctors={doctors} />
                        ) : (
                            (() => {
                                const doctor = doctors.find(d => d.id === activeTab);
                                if (!doctor) return null;
                                return (
                                    <div className="space-y-4">
                                        <TypeTable type="removable" records={doctor.records} />
                                        <TypeTable type="fixed"     records={doctor.records} />
                                    </div>
                                );
                            })()
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function AllDoctorsView({ doctors }: { doctors: DoctorData[] }) {
    const all = doctors.flatMap(d => d.records.map(r => ({ ...r, doctorName: d.name })));
    const active  = all.filter(r => r.is_active);
    const removed = all.filter(r => !r.is_active);

    return (
        <div className="space-y-5">
            <SummarySection title="Идэвхтэй бүртгэл" rows={active} colorClass="amber" showRemoved={false} />
            {removed.length > 0 && (
                <SummarySection title="Дууссан бүртгэл" rows={removed} colorClass="emerald" showRemoved={true} />
            )}
        </div>
    );
}

function SummarySection({ title, rows, colorClass, showRemoved }: {
    title: string;
    rows: (OrthoRecord & { doctorName: string })[];
    colorClass: 'amber' | 'emerald';
    showRemoved: boolean;
}) {
    const hdr = colorClass === 'amber'
        ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-800/30 text-amber-700 dark:text-amber-400'
        : 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400';
    const bdg = colorClass === 'amber'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400';

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${hdr}`}>
                <span className="text-sm font-bold">{title}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${bdg}`}>{rows.length}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                    <thead>
                        <tr className="border-b bg-muted/20">
                            <th className={thCls}>#</th>
                            <th className={thCls}>Эмч</th>
                            <th className={thCls}>Аппарат</th>
                            <th className={thCls}>Архив</th>
                            <th className={thCls}>Карт №</th>
                            <th className={thCls}>РД</th>
                            <th className={thCls}>Овог</th>
                            <th className={thCls}>Нэр</th>
                            <th className={thCls}>Утас</th>
                            <th className={thCls}>Зүүсэн</th>
                            {showRemoved && <th className={thCls}>Салгасан</th>}
                            <th className={thCls}>Тэмдэглэл</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {rows.length === 0 ? (
                            <tr><td colSpan={showRemoved ? 12 : 11} className="px-4 py-6 text-center text-muted-foreground">Бичлэг байхгүй</td></tr>
                        ) : rows.map((r, i) => (
                            <tr key={r.id} className={`hover:bg-muted/20 transition-colors ${!r.is_active ? 'opacity-70' : ''}`}>
                                <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                                <td className="px-2 py-1.5 font-medium whitespace-nowrap">{shortDoctorName(r.doctorName)}</td>
                                <td className="px-2 py-1.5">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.appliance_type === 'removable' ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400' : 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400'}`}>
                                        {r.appliance_type === 'removable' ? 'Авагддаг' : 'Авагддаггүй'}
                                    </span>
                                </td>
                                <td className="px-2 py-1.5">{r.archive_code || '—'}</td>
                                <td className="px-2 py-1.5 font-mono">{r.card_number || '—'}</td>
                                <td className="px-2 py-1.5 font-mono text-muted-foreground">{r.register_number || '—'}</td>
                                <td className="px-2 py-1.5 font-semibold">{r.last_name}</td>
                                <td className="px-2 py-1.5">{r.first_name}</td>
                                <td className="px-2 py-1.5">{r.phone || '—'}</td>
                                <td className="px-2 py-1.5 whitespace-nowrap">{r.attached_date || '—'}</td>
                                {showRemoved && (
                                    <td className="px-2 py-1.5 whitespace-nowrap">
                                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                            {r.removed_date}
                                        </span>
                                    </td>
                                )}
                                <td className="px-2 py-1.5 max-w-[140px] truncate text-muted-foreground">{r.notes || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
