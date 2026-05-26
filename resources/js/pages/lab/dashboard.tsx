import LabLayout from '@/layouts/lab-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle, ArrowRight, Building2, CalendarCheck2,
    CheckCircle2, ChevronRight, FlaskConical, MapPin,
    Phone, User,
} from 'lucide-react';

interface BranchInfo { id: number; name: string; address: string | null; phone: string | null }

interface Stats {
    active: number;
    completed: number;
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
}

interface Props {
    branch: BranchInfo | null;
    stats: Stats;
    recent: RecentItem[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Хяналтын самбар', href: '/lab/dashboard' }];

function fmt(n: number): string { return Math.round(n).toLocaleString(); }

export default function LabDashboard({ branch, stats, recent }: Props) {
    return (
        <LabLayout breadcrumbs={breadcrumbs}>
            <Head title="Лабораторийн хяналтын самбар" />

            <div className="flex flex-col gap-5 p-4 md:p-6">
                {/* ── Hero — subtle, not screaming ────────────── */}
                <div className="relative overflow-hidden rounded-2xl border border-violet-200/40 dark:border-violet-800/30 bg-gradient-to-br from-violet-50 via-card to-fuchsia-50/40 dark:from-violet-950/30 dark:via-card dark:to-fuchsia-950/20 shadow-sm">
                    <div className="absolute -right-12 -top-12 size-40 rounded-full bg-violet-200/40 dark:bg-violet-700/15 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 right-1/3 size-32 rounded-full bg-fuchsia-200/40 dark:bg-fuchsia-700/15 blur-3xl pointer-events-none" />

                    <div className="relative flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                        <div className="flex items-center gap-3.5">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30">
                                <FlaskConical className="size-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground leading-tight">Лабораторийн портал</h1>
                                {branch ? (
                                    <p className="text-[12px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                        <span className="inline-flex items-center gap-1"><Building2 className="size-3" />{branch.name}</span>
                                        {branch.address && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{branch.address}</span>}
                                        {branch.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{branch.phone}</span>}
                                    </p>
                                ) : (
                                    <p className="text-[12px] text-muted-foreground mt-0.5">Лаб ажлуудын хяналтын самбар</p>
                                )}
                            </div>
                        </div>

                        <Link href="/lab/lab-orders"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition-colors">
                            Лаб бүртгэл
                            <ArrowRight className="size-4" />
                        </Link>
                    </div>
                </div>

                {/* ── Захиалгын статистик ──────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Tile tone="violet"  icon={<FlaskConical className="size-5" />}   label="Идэвхтэй захиалга" value={fmt(stats.active)} />
                    <Tile tone="emerald" icon={<CheckCircle2 className="size-5" />}   label="Дууссан"           value={fmt(stats.completed)} />
                    <Tile tone="blue"    icon={<CalendarCheck2 className="size-5" />} label="Өнөөдөр авах"      value={fmt(stats.arriving_today)} />
                    <Tile tone="red"     icon={<AlertCircle className="size-5" />}    label="Хугацаа хэтэрсэн"  value={fmt(stats.overdue)} highlight={stats.overdue > 0} />
                </div>

                {/* ── Сүүлийн идэвхтэй захиалгууд ─────────────── */}
                <section className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b">
                        <h2 className="text-sm font-bold text-foreground inline-flex items-center gap-2">
                            <span className="size-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                                <FlaskConical className="size-3.5 text-violet-600 dark:text-violet-400" />
                            </span>
                            Сүүлийн идэвхтэй захиалгууд
                        </h2>
                        <Link href="/lab/lab-orders" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 inline-flex items-center gap-1">
                            Бүгдийг үзэх <ArrowRight className="size-3" />
                        </Link>
                    </div>

                    {recent.length === 0 ? (
                        <div className="px-4 py-14 text-center">
                            <div className="mx-auto size-14 rounded-2xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center mb-3">
                                <FlaskConical className="size-7 text-violet-300 dark:text-violet-700" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">Идэвхтэй лаб бүртгэл алга</p>
                            <p className="text-xs text-muted-foreground mt-1">Шинэ бүртгэл нэмэхдээ Лаб бүртгэл хуудас руу очно уу</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/40">
                            {recent.map(o => (
                                <Link key={o.id} href="/lab/lab-orders"
                                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors group">
                                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shrink-0 shadow-sm">
                                        <FlaskConical className="size-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-foreground truncate">{o.lab_name}</p>
                                            <span className="text-[10px] text-muted-foreground">·</span>
                                            <p className="text-xs text-muted-foreground truncate">{o.work_description}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                                            <span className="inline-flex items-center gap-1"><User className="size-3" />{`${o.patient_last_name ?? ''} ${o.patient_first_name}`.trim()}</span>
                                            {o.doctor_name && <span className="inline-flex items-center gap-1">Эмч: {o.doctor_name}</span>}
                                            {o.pickup_date && <span className="inline-flex items-center gap-1"><CalendarCheck2 className="size-3" />{o.pickup_date}</span>}
                                        </div>
                                    </div>
                                    {o.order_date && (
                                        <div className="text-right shrink-0">
                                            <span className="text-[11px] text-muted-foreground tabular-nums">{o.order_date}</span>
                                        </div>
                                    )}
                                    <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-violet-500 transition-colors shrink-0" />
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </LabLayout>
    );
}

/* ── Components ─────────────────────────────────────────────── */
type Tone = 'violet' | 'emerald' | 'red' | 'blue';
const TONE: Record<Tone, { bg: string; iconBg: string; text: string; ring: string }> = {
    violet:  { bg: 'bg-violet-50/40 dark:bg-violet-950/15',   iconBg: 'bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400',     text: 'text-violet-700 dark:text-violet-400',   ring: 'ring-violet-200/40 dark:ring-violet-800/30' },
    emerald: { bg: 'bg-emerald-50/40 dark:bg-emerald-950/15', iconBg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-400', ring: 'ring-emerald-200/40 dark:ring-emerald-800/30' },
    red:     { bg: 'bg-red-50/40 dark:bg-red-950/15',         iconBg: 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400',                 text: 'text-red-700 dark:text-red-400',         ring: 'ring-red-200/40 dark:ring-red-800/30' },
    blue:    { bg: 'bg-blue-50/40 dark:bg-blue-950/15',       iconBg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',             text: 'text-blue-700 dark:text-blue-400',       ring: 'ring-blue-200/40 dark:ring-blue-800/30' },
};

function Tile({ icon, label, value, tone, highlight }: { icon: React.ReactNode; label: string; value: string; tone: Tone; highlight?: boolean }) {
    const t = TONE[tone];
    return (
        <div className={`relative rounded-2xl border bg-card shadow-sm px-4 py-3.5 flex items-center gap-3.5 ${highlight ? `ring-2 ${t.ring}` : ''}`}>
            <div className={`size-11 shrink-0 rounded-xl flex items-center justify-center ${t.iconBg}`}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold leading-tight">{label}</p>
                <p className={`text-2xl font-bold tabular-nums ${t.text} leading-tight mt-1`}>{value}</p>
            </div>
            {highlight && (
                <span className="absolute top-2 right-2 inline-flex size-2 rounded-full bg-red-500 animate-pulse" />
            )}
        </div>
    );
}

