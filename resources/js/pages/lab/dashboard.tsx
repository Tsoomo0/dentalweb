import LabLayout from '@/layouts/lab-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle, ArrowRight, Building2, CalendarCheck2,
    CheckCircle2, FlaskConical, MapPin, Phone, Sparkles, Wallet,
} from 'lucide-react';

interface BranchInfo { id: number; name: string; address: string | null; phone: string | null }

interface Stats {
    active: number;
    completed: number;
    total_due: number;
    total_paid: number;
    total_outstanding: number;
    overdue: number;
    arriving_today: number;
}

interface RecentItem {
    id: number;
    order_date: string | null;
    lab_name: string;
    patient_first_name: string;
    patient_last_name: string | null;
    doctor_name: string | null;
    work_description: string;
    pickup_date: string | null;
    outstanding: number;
}

interface Props {
    branch: BranchInfo | null;
    stats: Stats;
    recent: RecentItem[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Хяналтын самбар', href: '/lab/dashboard' }];

export default function LabDashboard({ branch, stats, recent }: Props) {
    return (
        <LabLayout breadcrumbs={breadcrumbs}>
            <Head title="Лабораторийн хяналтын самбар" />

            <div className="flex flex-col gap-5 p-4 md:p-6">
                {/* Premium Header */}
                <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/40 dark:via-gray-900 dark:to-fuchsia-950/30 p-5 shadow-sm">
                    <div className="absolute -right-8 -top-8 size-32 rounded-full bg-violet-200/40 dark:bg-violet-700/20 blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 size-24 rounded-full bg-fuchsia-200/40 dark:bg-fuchsia-700/20 blur-2xl" />

                    <div className="relative flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30">
                                <FlaskConical className="size-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    Лабораторийн портал
                                    <Sparkles className="size-4 text-violet-500" />
                                </h1>
                                {branch ? (
                                    <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                        <span className="inline-flex items-center gap-1"><Building2 className="size-3" />{branch.name}</span>
                                        {branch.address && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{branch.address}</span>}
                                        {branch.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{branch.phone}</span>}
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground mt-0.5">Лаб ажлуудын хяналтын самбар</p>
                                )}
                            </div>
                        </div>

                        <Link href="/lab/lab-orders"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition-colors">
                            Лаб бүртгэл рүү очих
                            <ArrowRight className="size-4" />
                        </Link>
                    </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <StatCard
                        icon={<FlaskConical className="size-5" />}
                        label="Идэвхтэй захиалга"
                        value={stats.active.toLocaleString()}
                        accent="violet"
                    />
                    <StatCard
                        icon={<CheckCircle2 className="size-5" />}
                        label="Дууссан"
                        value={stats.completed.toLocaleString()}
                        accent="emerald"
                    />
                    <StatCard
                        icon={<CalendarCheck2 className="size-5" />}
                        label="Өнөөдөр авах"
                        value={stats.arriving_today.toLocaleString()}
                        accent="blue"
                    />
                    <StatCard
                        icon={<AlertCircle className="size-5" />}
                        label="Хугацаа хэтэрсэн"
                        value={stats.overdue.toLocaleString()}
                        accent="red"
                    />
                    <StatCard
                        icon={<Wallet className="size-5" />}
                        label="Нийт төлөх"
                        value={`${stats.total_due.toLocaleString()}₮`}
                        accent="gray"
                    />
                    <StatCard
                        icon={<Wallet className="size-5" />}
                        label="Төлсөн"
                        value={`${stats.total_paid.toLocaleString()}₮`}
                        accent="emerald"
                    />
                    <StatCard
                        icon={<AlertCircle className="size-5" />}
                        label="Дутуу тооцоо"
                        value={`${stats.total_outstanding.toLocaleString()}₮`}
                        accent="red"
                    />
                    <StatCard
                        icon={<FlaskConical className="size-5" />}
                        label="Нийт бүртгэл"
                        value={(stats.active + stats.completed).toLocaleString()}
                        accent="violet"
                    />
                </div>

                {/* Recent active orders */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3.5">
                        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <FlaskConical className="size-4 text-violet-500" />
                            Сүүлийн идэвхтэй захиалгууд
                        </h2>
                        <Link href="/lab/lab-orders" className="text-xs font-semibold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1">
                            Бүгдийг үзэх <ArrowRight className="size-3" />
                        </Link>
                    </div>

                    {recent.length === 0 ? (
                        <div className="px-4 py-12 text-center text-muted-foreground">
                            <FlaskConical className="size-10 mx-auto mb-3 text-violet-300" />
                            <p className="text-sm font-semibold">Идэвхтэй лаб бүртгэл алга</p>
                            <p className="text-xs mt-1">Шинэ бүртгэл нэмэхдээ Лаб бүртгэл хуудас руу очно уу</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-[10.5px] uppercase tracking-wide">
                                        <th className="px-3 py-2.5 text-left font-semibold">Захиалсан</th>
                                        <th className="px-3 py-2.5 text-left font-semibold">Лаб</th>
                                        <th className="px-3 py-2.5 text-left font-semibold">Өвчтөн</th>
                                        <th className="px-3 py-2.5 text-left font-semibold">Эмч</th>
                                        <th className="px-3 py-2.5 text-left font-semibold">Ажил</th>
                                        <th className="px-3 py-2.5 text-left font-semibold">Авах</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">Дутуу</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent.map((o, i) => (
                                        <tr key={o.id} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/15'}>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{o.order_date ?? '—'}</td>
                                            <td className="px-3 py-2 font-semibold text-foreground">{o.lab_name}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{`${o.patient_last_name ?? ''} ${o.patient_first_name}`.trim()}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{o.doctor_name ?? '—'}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{o.work_description}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{o.pickup_date ?? '—'}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {o.outstanding > 0 ? (
                                                    <span className="rounded-lg bg-red-50 dark:bg-red-950/40 px-2 py-0.5 font-bold text-red-700 dark:text-red-400">
                                                        {o.outstanding.toLocaleString()}
                                                    </span>
                                                ) : <span className="text-emerald-600 font-bold">0</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </LabLayout>
    );
}

type StatAccent = 'violet' | 'emerald' | 'red' | 'blue' | 'gray';

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: StatAccent }) {
    const palette: Record<StatAccent, { gradient: string; text: string; border: string }> = {
        violet:  { gradient: 'from-violet-500 to-fuchsia-600',  text: 'text-violet-700 dark:text-violet-400',  border: 'border-violet-200/60 dark:border-violet-800/40' },
        emerald: { gradient: 'from-emerald-500 to-teal-600',    text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200/60 dark:border-emerald-800/40' },
        red:     { gradient: 'from-red-500 to-rose-600',        text: 'text-red-700 dark:text-red-400',         border: 'border-red-200/60 dark:border-red-800/40' },
        blue:    { gradient: 'from-blue-500 to-indigo-600',     text: 'text-blue-700 dark:text-blue-400',       border: 'border-blue-200/60 dark:border-blue-800/40' },
        gray:    { gradient: 'from-gray-500 to-slate-600',      text: 'text-gray-700 dark:text-gray-300',       border: 'border-gray-200/60 dark:border-gray-800/40' },
    };
    const p = palette[accent];

    return (
        <div className={`rounded-2xl border bg-card p-4 shadow-sm ${p.border}`}>
            <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${p.gradient} text-white`}>
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold truncate">{label}</p>
                    <p className={`text-lg font-bold tabular-nums truncate ${p.text}`}>{value}</p>
                </div>
            </div>
        </div>
    );
}
