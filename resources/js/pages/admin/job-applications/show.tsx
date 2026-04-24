import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft, Printer, Trash2, Save,
    CheckCircle2, Star, XCircle, Eye,
    Phone, Mail, MapPin, Car, BookOpen, Briefcase,
    Languages, Award, Users, Info, GraduationCap,
    Calendar, Clock, FileText, Heart, Monitor, Sparkles,
    ChevronRight, Building2,
} from 'lucide-react';
import { useState } from 'react';

/* ── Types ──────────────────────────────────────────────────────────── */
interface Application {
    id: number;
    last_name: string; first_name: string; family_name: string | null;
    gender: string | null; birth_city: string | null; birth_date: string | null;
    register_no: string | null;
    has_insurance: boolean; has_health_insurance: boolean;
    address: string | null; has_driving_license: boolean; driving_class: string | null;
    has_car: boolean; phone_home: string | null; phone_mobile: string | null; email: string | null;
    education: Array<{ school: string; enrolled_year: string; graduated_year: string; major: string; degree: string; gpa: string }> | null;
    professional_training: Array<{ organization: string; date: string; duration: string; field: string }> | null;
    total_work_years: string | null; unverified_work_years: string | null; employment_status: string | null;
    work_experience: Array<{ organization: string; position: string; duties: string; start_date: string; end_date: string; leave_reason: string; gap_reason: string }> | null;
    skills_languages: Array<{ name: string; write: string; speak: string; listen: string; read: string; interpret_oral: string; interpret_written: string }> | null;
    skills_computer: { ms_word: string; ms_excel: string; ms_powerpoint: string; ms_project: string; access: string; outlook: string; internet: string; other: string } | null;
    skills_talents: Array<{ type: string; years: string; achievement: string }> | null;
    awards: Array<{ year: string; name: string; description: string }> | null;
    references: Array<{ name: string; relation: string; phone: string; occupation: string }> | null;
    is_married: boolean;
    family_members: Array<{ name: string; relation: string; birth_year: string; occupation: string; phone: string }> | null;
    family_relatives: Array<{ name: string; relation: string; birth_year: string; occupation: string; phone: string }> | null;
    health_status: string | null; goals_5years: string | null;
    strengths: string | null; weaknesses: string | null;
    additional_info: string | null; info_source: string | null;
    status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected';
    admin_notes: string | null;
    created_at: string; updated_at: string;
}

interface Props { application: Application }

/* ── Constants ──────────────────────────────────────────────────────── */
const STATUS_OPTIONS = [
    { value: 'pending',     label: 'Хүлээгдэж буй', icon: Eye,          cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',   dot: 'bg-amber-500'  },
    { value: 'reviewed',    label: 'Хянасан',         icon: CheckCircle2, cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',           dot: 'bg-blue-500'   },
    { value: 'shortlisted', label: 'Сонгогдсон',      icon: Star,         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500'},
    { value: 'rejected',    label: 'Татгалзсан',       icon: XCircle,      cls: 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700',           dot: 'bg-zinc-400'   },
] as const;

/* ── Level badge ────────────────────────────────────────────────────── */
function LevelBadge({ value }: { value?: string | null }) {
    if (!value) return <span className="text-xs text-muted-foreground">—</span>;
    const map: Record<string, string> = {
        'Маш сайн': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        'Сайн':     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        'Дунд':     'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        'Суурь':    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
        'Мэргэжлийн': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    };
    const cls = map[value] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{value}</span>;
}

/* ── Section heading ────────────────────────────────────────────────── */
function SectionHeading({
    icon: Icon, label, color,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
}) {
    return (
        <div className="mb-5 flex items-center gap-3">
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="size-4" />
            </div>
            <h3 className="font-semibold text-base">{label}</h3>
        </div>
    );
}

/* ── Info grid row ──────────────────────────────────────────────────── */
function GridInfo({ items }: { items: Array<{ label: string; value?: string | null; wide?: boolean }> }) {
    const visible = items.filter(i => i.value);
    if (!visible.length) return null;
    return (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {visible.map((item, i) => (
                <div key={i} className={item.wide ? 'col-span-2 sm:col-span-3' : ''}>
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}

/* ── Bool chip ──────────────────────────────────────────────────────── */
function BoolChip({ label, value }: { label: string; value: boolean }) {
    return (
        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                value
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
            }`}>{value ? 'Тийм' : 'Үгүй'}</span>
        </div>
    );
}

/* ── Timeline item ──────────────────────────────────────────────────── */
function TimelineItem({ isLast, children }: { isLast?: boolean; children: React.ReactNode }) {
    return (
        <div className="relative flex gap-4">
            <div className="flex flex-col items-center">
                <div className="mt-1 size-3 shrink-0 rounded-full border-2 border-red-400 bg-white dark:bg-background" />
                {!isLast && <div className="mt-1 flex-1 w-0.5 bg-border" />}
            </div>
            <div className={`pb-5 flex-1 min-w-0 ${isLast ? '' : ''}`}>{children}</div>
        </div>
    );
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function JobApplicationShow({ application: a }: Props) {
    const [status, setStatus] = useState(a.status);
    const [notes, setNotes]   = useState(a.admin_notes ?? '');
    const [saving, setSaving] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Админ', href: '/admin/dashboard' },
        { title: 'Ажлын анкет', href: '/admin/job-applications' },
        { title: a.last_name + ' ' + a.first_name, href: `/admin/job-applications/${a.id}` },
    ];

    const currentStatus = STATUS_OPTIONS.find(s => s.value === status)!;

    function save() {
        setSaving(true);
        router.patch(`/admin/job-applications/${a.id}`, { status, admin_notes: notes }, {
            onFinish: () => setSaving(false),
        });
    }

    function deleteApp() {
        if (confirm('Энэ анкетыг устгах уу?')) {
            router.delete(`/admin/job-applications/${a.id}`);
        }
    }

    const initials = (a.last_name[0] ?? '') + (a.first_name[0] ?? '');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={a.last_name + ' ' + a.first_name + ' — Анкет'} />

            <style>{`
                @media print {
                    aside, nav, header, footer,
                    .no-print,
                    [data-sidebar],
                    [data-sidebar-inset] { display: none !important; }
                    body, html { background: #fff !important; }
                    .screen-only { display: none !important; }
                    .print-only  { display: block !important; }
                    .print-area  { padding: 0 !important; }
                    @page { margin: 15mm 12mm; size: A4; }
                }
                @media screen {
                    .print-only { display: none !important; }
                }
            `}</style>

            {/* ════════════════════════════════════════════════
                PRINT-ONLY: цэвэр хүснэгт бүхий PDF загвар
            ════════════════════════════════════════════════ */}
            <PrintView a={a} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 print-area screen-only">

                {/* ── Top toolbar ── */}
                <div className="flex items-center justify-between no-print">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/admin/job-applications"
                            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <ArrowLeft className="size-4" />
                            Буцах
                        </Link>
                        <ChevronRight className="size-4 text-muted-foreground/40" />
                        <span className="text-sm font-medium">{a.last_name} {a.first_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                        >
                            <Printer className="size-4" /> Хэвлэх / PDF
                        </button>
                        <button
                            onClick={deleteApp}
                            className="flex items-center gap-2 rounded-lg border border-red-200 bg-background px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950 transition-colors"
                        >
                            <Trash2 className="size-4" /> Устгах
                        </button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                    {/* ════════════════════════════════════════════════
                        LEFT: Application content
                    ════════════════════════════════════════════════ */}
                    <div className="space-y-5 lg:col-span-2">

                        {/* ── Profile hero ── */}
                        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm print-card">
                            {/* gradient banner */}
                            <div className="h-20 bg-gradient-to-r from-red-500 via-red-600 to-rose-700" />
                            <div className="px-6 pb-6">
                                <div className="flex items-end gap-4 -mt-10">
                                    <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border-4 border-background bg-gradient-to-br from-red-400 to-red-600 text-2xl font-extrabold text-white shadow-lg">
                                        {initials}
                                    </div>
                                    <div className="pb-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-xl font-bold leading-tight">
                                                {a.last_name} {a.first_name}
                                            </h2>
                                            {a.family_name && (
                                                <span className="text-sm text-muted-foreground">({a.family_name})</span>
                                            )}
                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${currentStatus.cls}`}>
                                                <span className={`size-1.5 rounded-full ${currentStatus.dot}`} />
                                                {currentStatus.label}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {a.phone_mobile && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                                                    <Phone className="size-3 text-red-500" /> {a.phone_mobile}
                                                </span>
                                            )}
                                            {a.phone_home && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                                                    <Phone className="size-3" /> {a.phone_home}
                                                </span>
                                            )}
                                            {a.email && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                                                    <Mail className="size-3 text-red-500" /> {a.email}
                                                </span>
                                            )}
                                            {a.address && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                                                    <MapPin className="size-3" /> {a.address}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── 1. Үндсэн мэдээлэл ── */}
                        <div className="rounded-2xl border bg-card p-6 shadow-sm print-card">
                            <SectionHeading icon={Info} label="Үндсэн мэдээлэл" color="bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400" />
                            <GridInfo items={[
                                { label: 'Хүйс',              value: a.gender },
                                { label: 'Төрсөн аймаг, хот', value: a.birth_city },
                                { label: 'Төрсөн огноо',      value: a.birth_date },
                                { label: 'Регистр №',          value: a.register_no },
                            ]} />
                            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <BoolChip label="НДД"   value={a.has_insurance} />
                                <BoolChip label="ЭМДД"  value={a.has_health_insurance} />
                                <BoolChip label="Машинтай" value={a.has_car} />
                                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Car className="size-3.5" /> Жолооны
                                    </span>
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                        a.has_driving_license
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                    }`}>
                                        {a.has_driving_license
                                            ? `${a.driving_class ? a.driving_class + ' анги' : 'Тийм'}`
                                            : 'Үгүй'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── 2. Боловсрол ── */}
                        {((a.education?.length ?? 0) > 0 || (a.professional_training?.length ?? 0) > 0) && (
                            <div className="rounded-2xl border bg-card p-6 shadow-sm print-card">
                                <SectionHeading icon={GraduationCap} label="Боловсрол" color="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400" />

                                {(a.education?.length ?? 0) > 0 && (
                                    <>
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Дээд боловсрол</p>
                                        <div className="mb-5">
                                            {a.education?.map((edu, i) => (
                                                <TimelineItem key={i} isLast={i === (a.education!.length - 1)}>
                                                    <div className="rounded-xl border bg-muted/30 p-4">
                                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                                            <div>
                                                                <p className="font-semibold">{edu.school}</p>
                                                                <p className="mt-0.5 text-sm text-muted-foreground">{edu.major}</p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                                                    <Calendar className="size-3" />
                                                                    {edu.enrolled_year} – {edu.graduated_year}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            {edu.degree && (
                                                                <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                                                                    {edu.degree}
                                                                </span>
                                                            )}
                                                            {edu.gpa && (
                                                                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                    GPA: {edu.gpa}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TimelineItem>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {(a.professional_training?.length ?? 0) > 0 && (
                                    <>
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Мэргэшлийн сургалт</p>
                                        <div>
                                            {a.professional_training?.map((tr, i) => (
                                                <TimelineItem key={i} isLast={i === (a.professional_training!.length - 1)}>
                                                    <div className="rounded-xl border bg-muted/30 p-4">
                                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                                            <div>
                                                                <p className="font-semibold">{tr.organization}</p>
                                                                <p className="mt-0.5 text-sm text-muted-foreground">{tr.field}</p>
                                                            </div>
                                                            {tr.date && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 shrink-0">
                                                                    <Calendar className="size-3" />
                                                                    {tr.date}{tr.duration && ` • ${tr.duration}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TimelineItem>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── 3. Ажлын туршлага ── */}
                        {(a.work_experience?.length ?? 0) > 0 && (
                            <div className="rounded-2xl border bg-card p-6 shadow-sm print-card">
                                <SectionHeading icon={Briefcase} label="Ажлын туршлага" color="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" />

                                {/* Summary chips */}
                                <div className="mb-5 flex flex-wrap gap-2">
                                    {a.total_work_years && (
                                        <div className="rounded-xl border bg-orange-50 px-4 py-2.5 dark:bg-orange-900/20">
                                            <p className="text-[11px] text-orange-600/70 dark:text-orange-400/70 font-medium">Нийт туршлага</p>
                                            <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{a.total_work_years} <span className="text-sm font-normal">жил</span></p>
                                        </div>
                                    )}
                                    {a.unverified_work_years && (
                                        <div className="rounded-xl border bg-muted/40 px-4 py-2.5">
                                            <p className="text-[11px] text-muted-foreground font-medium">Баталгаажаагүй</p>
                                            <p className="text-lg font-bold">{a.unverified_work_years} <span className="text-sm font-normal text-muted-foreground">жил</span></p>
                                        </div>
                                    )}
                                    {a.employment_status && (
                                        <div className="rounded-xl border bg-muted/40 px-4 py-2.5">
                                            <p className="text-[11px] text-muted-foreground font-medium">Хөдөлмөр эрхлэлт</p>
                                            <p className="text-sm font-bold mt-0.5">{a.employment_status}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Timeline */}
                                {a.work_experience?.map((w, i) => (
                                    <TimelineItem key={i} isLast={i === (a.work_experience!.length - 1)}>
                                        <div className="rounded-xl border bg-muted/30 p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-semibold">{w.organization}</p>
                                                    <p className="mt-0.5 text-sm font-medium text-orange-600 dark:text-orange-400">{w.position}</p>
                                                </div>
                                                {(w.start_date || w.end_date) && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 shrink-0">
                                                        <Clock className="size-3" />
                                                        {w.start_date} – {w.end_date || 'Одоог хүртэл'}
                                                    </span>
                                                )}
                                            </div>
                                            {w.duties && (
                                                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{w.duties}</p>
                                            )}
                                            {w.leave_reason && (
                                                <div className="mt-2 rounded-lg bg-background/60 border border-border/60 px-3 py-1.5">
                                                    <span className="text-xs text-muted-foreground">Гарсан шалтгаан: </span>
                                                    <span className="text-xs">{w.leave_reason}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TimelineItem>
                                ))}
                            </div>
                        )}

                        {/* ── 4. Ур чадвар ── */}
                        <div className="rounded-2xl border bg-card p-6 shadow-sm print-card">
                            <SectionHeading icon={Languages} label="Ур чадвар" color="bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400" />

                            {/* Language skills */}
                            {(a.skills_languages?.length ?? 0) > 0 && (
                                <div className="mb-6">
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Гадаад хэл</p>
                                    <div className="overflow-x-auto rounded-xl border">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b bg-muted/40">
                                                    {['Хэл', 'Бичих', 'Ярих', 'Сонсох', 'Унших', 'Аман орч.', 'Бичгийн орч.'].map(h => (
                                                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {a.skills_languages?.map((l, i) => (
                                                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                                        <td className="px-3 py-2.5 font-semibold">{l.name}</td>
                                                        <td className="px-3 py-2.5"><LevelBadge value={l.write} /></td>
                                                        <td className="px-3 py-2.5"><LevelBadge value={l.speak} /></td>
                                                        <td className="px-3 py-2.5"><LevelBadge value={l.listen} /></td>
                                                        <td className="px-3 py-2.5"><LevelBadge value={l.read} /></td>
                                                        <td className="px-3 py-2.5"><LevelBadge value={l.interpret_oral} /></td>
                                                        <td className="px-3 py-2.5"><LevelBadge value={l.interpret_written} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Computer skills */}
                            {a.skills_computer && (
                                <div className="mb-6">
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        <Monitor className="inline size-3 mr-1" />
                                        Компьютерийн чадвар
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        {(Object.entries({
                                            ms_word: 'MS Word', ms_excel: 'MS Excel',
                                            ms_powerpoint: 'PowerPoint', ms_project: 'MS Project',
                                            access: 'Access', outlook: 'Outlook',
                                            internet: 'Internet', other: 'Бусад',
                                        }) as [keyof typeof a.skills_computer, string][]).map(([k, label]) => {
                                            const val = a.skills_computer![k];
                                            if (!val) return null;
                                            return (
                                                <div key={k} className="rounded-xl border bg-muted/30 p-3 text-center">
                                                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                                                    <div className="mt-1.5">
                                                        <LevelBadge value={val} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Talents */}
                            {(a.skills_talents?.length ?? 0) > 0 && (
                                <div>
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        <Sparkles className="inline size-3 mr-1" />
                                        Авьяас чадвар
                                    </p>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {a.skills_talents?.map((t, i) => (
                                            <div key={i} className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300">
                                                    <Sparkles className="size-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold truncate">{t.type}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t.years && `${t.years} жил`}{t.years && t.achievement ? ' · ' : ''}{t.achievement}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── 5. Гавъяа шагнал ── */}
                        {(a.awards?.length ?? 0) > 0 && (
                            <div className="rounded-2xl border bg-card p-6 shadow-sm print-card">
                                <SectionHeading icon={Award} label="Гавъяа шагнал" color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" />
                                <div className="space-y-2">
                                    {a.awards?.map((aw, i) => (
                                        <div key={i} className="flex items-start gap-4 rounded-xl border bg-muted/30 p-4">
                                            {aw.year && (
                                                <div className="shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 text-center dark:bg-amber-900/30">
                                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300">{aw.year}</p>
                                                    <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">он</p>
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm">{aw.name}</p>
                                                {aw.description && <p className="mt-0.5 text-sm text-muted-foreground">{aw.description}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── 6. Тодорхойлолт ── */}
                        {(a.references?.length ?? 0) > 0 && (
                            <div className="rounded-2xl border bg-card p-6 shadow-sm print-card">
                                <SectionHeading icon={BookOpen} label="Тодорхойлолт" color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400" />
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {a.references?.map((r, i) => (
                                        <div key={i} className="rounded-xl border bg-muted/30 p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold dark:bg-indigo-900/40 dark:text-indigo-300">
                                                    {r.name ? r.name[0] : '?'}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm leading-tight">{r.name}</p>
                                                    {r.relation && (
                                                        <span className="inline-block rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800 mt-0.5">
                                                            {r.relation}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {r.occupation && (
                                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Building2 className="size-3" /> {r.occupation}
                                                </p>
                                            )}
                                            {r.phone && (
                                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                                    <Phone className="size-3 text-indigo-500" /> {r.phone}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── 7. Гэр бүл ── */}
                        {((a.family_members?.length ?? 0) > 0 || (a.family_relatives?.length ?? 0) > 0) && (
                            <div className="rounded-2xl border bg-card p-6 shadow-sm print-card">
                                <SectionHeading icon={Users} label="Гэр бүлийн байдал" color="bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400" />

                                <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
                                    <Heart className={`size-3.5 ${a.is_married ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground'}`} />
                                    <span className="text-sm font-medium">
                                        {a.is_married ? 'Гэрлэсэн' : 'Гэрлээгүй'}
                                    </span>
                                </div>

                                {(a.family_members?.length ?? 0) > 0 && (
                                    <div className="mb-4">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Гэр бүлийн гишүүд</p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {a.family_members?.map((m, i) => (
                                                <FamilyCard key={i} person={m} color="rose" />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(a.family_relatives?.length ?? 0) > 0 && (
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ураг төрлийн мэдээлэл</p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {a.family_relatives?.map((r, i) => (
                                                <FamilyCard key={i} person={r} color="pink" />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── 8. Бусад мэдээлэл ── */}
                        <div className="rounded-2xl border bg-card p-6 shadow-sm print-card">
                            <SectionHeading icon={FileText} label="Бусад мэдээлэл" color="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" />

                            <div className="space-y-4">
                                {a.health_status && (
                                    <div className="rounded-xl bg-muted/40 p-4">
                                        <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Эрүүл мэндийн байдал</p>
                                        <p className="text-sm">{a.health_status}</p>
                                    </div>
                                )}
                                {a.info_source && (
                                    <div className="rounded-xl bg-muted/40 p-4">
                                        <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Мэдээлэл авсан эх сурвалж</p>
                                        <p className="text-sm">{a.info_source}</p>
                                    </div>
                                )}
                                {a.goals_5years && (
                                    <div className="rounded-xl border-l-4 border-blue-400 bg-blue-50/60 p-4 dark:bg-blue-950/20">
                                        <p className="mb-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Ойрын 5 жилийн зорилго</p>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{a.goals_5years}</p>
                                    </div>
                                )}
                                {a.strengths && (
                                    <div className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50/60 p-4 dark:bg-emerald-950/20">
                                        <p className="mb-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Давуу тал</p>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{a.strengths}</p>
                                    </div>
                                )}
                                {a.weaknesses && (
                                    <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50/60 p-4 dark:bg-amber-950/20">
                                        <p className="mb-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Сул тал</p>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{a.weaknesses}</p>
                                    </div>
                                )}
                                {a.additional_info && (
                                    <div className="rounded-xl border-l-4 border-zinc-400 bg-muted/40 p-4">
                                        <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Нэмэлт танилцуулга</p>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{a.additional_info}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════════
                        RIGHT: Admin controls
                    ════════════════════════════════════════════════ */}
                    <div className="lg:col-span-1 no-print">
                        <div className="sticky top-6 space-y-4">

                            {/* Current status display */}
                            <div className={`rounded-2xl border p-5 ${currentStatus.cls}`}>
                                <div className="flex items-center gap-3">
                                    <currentStatus.icon className="size-5 shrink-0" />
                                    <div>
                                        <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">Одоогийн статус</p>
                                        <p className="font-bold text-base leading-tight">{currentStatus.label}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Status selector */}
                            <div className="rounded-2xl border bg-card p-5 shadow-sm">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Статус өөрчлөх</p>
                                <div className="space-y-2">
                                    {STATUS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setStatus(opt.value)}
                                            className={`group flex w-full items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                                                status === opt.value
                                                    ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 shadow-sm'
                                                    : 'border-transparent hover:border-border hover:bg-muted'
                                            }`}
                                        >
                                            <span className={`size-2 rounded-full ${opt.dot} shrink-0`} />
                                            <opt.icon className="size-4 shrink-0 opacity-70" />
                                            {opt.label}
                                            {status === opt.value && (
                                                <CheckCircle2 className="ml-auto size-4 text-red-500 shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="rounded-2xl border bg-card p-5 shadow-sm">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Тэмдэглэл</p>
                                <textarea
                                    rows={5}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Тэмдэглэл бичих..."
                                    className="border-input bg-background w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none transition-colors"
                                />
                                <button
                                    onClick={save}
                                    disabled={saving}
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-red-700 hover:to-red-800 disabled:opacity-60 transition-all active:scale-[0.98]"
                                >
                                    <Save className="size-4" />
                                    {saving ? 'Хадгалж байна...' : 'Хадгалах'}
                                </button>
                            </div>

                            {/* Meta */}
                            <div className="rounded-2xl border bg-card p-5 shadow-sm">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Дэлгэрэнгүй</p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <Calendar className="size-3.5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground">Илгээсэн</p>
                                            <p className="text-xs font-semibold">{a.created_at}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <Clock className="size-3.5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground">Шинэчлэгдсэн</p>
                                            <p className="text-xs font-semibold">{a.updated_at}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <Info className="size-3.5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground">Дугаар</p>
                                            <p className="text-xs font-semibold">#{a.id}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

/* ── PrintView ──────────────────────────────────────────────────────── */
const S = {
    page:       { fontFamily: 'Arial, sans-serif', fontSize: '9pt', color: '#000', background: '#fff', padding: '0' } as React.CSSProperties,
    tbl:        { width: '100%', borderCollapse: 'collapse' as const, marginBottom: '10px', pageBreakInside: 'avoid' as const },
    secHead:    { background: '#1a1a1a', color: '#fff', fontWeight: 'bold', fontSize: '9pt', padding: '5px 8px', textAlign: 'left' as const } as React.CSSProperties,
    subHead:    { background: '#e8e8e8', fontWeight: 'bold', fontSize: '8pt', padding: '4px 8px', textAlign: 'left' as const, border: '1px solid #999' } as React.CSSProperties,
    lbl:        { background: '#f5f5f5', fontWeight: 'bold', fontSize: '8pt', padding: '4px 8px', border: '1px solid #ccc', width: '26%', verticalAlign: 'top' as const } as React.CSSProperties,
    val:        { fontSize: '8.5pt', padding: '4px 8px', border: '1px solid #ccc', verticalAlign: 'top' as const } as React.CSSProperties,
    colHead:    { background: '#d0d0d0', fontWeight: 'bold', fontSize: '8pt', padding: '4px 6px', border: '1px solid #999', textAlign: 'center' as const } as React.CSSProperties,
    cell:       { fontSize: '8.5pt', padding: '4px 6px', border: '1px solid #ccc', verticalAlign: 'top' as const } as React.CSSProperties,
    bool: (v: boolean) => ({ fontSize: '8.5pt', padding: '4px 8px', border: '1px solid #ccc', color: v ? '#166534' : '#6b7280', fontWeight: v ? 'bold' : 'normal' } as React.CSSProperties),
};

function PrintRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <tr>
            <td style={S.lbl}>{label}</td>
            <td style={S.val}>{value}</td>
        </tr>
    );
}

function PrintBoolRow({ label, value }: { label: string; value: boolean }) {
    return (
        <tr>
            <td style={S.lbl}>{label}</td>
            <td style={S.bool(value)}>{value ? 'Тийм ✓' : 'Үгүй'}</td>
        </tr>
    );
}

function PrintView({ a }: { a: Application }) {
    const STATUS_MN: Record<string, string> = {
        pending: 'Хүлээгдэж буй', reviewed: 'Хянасан',
        shortlisted: 'Сонгогдсон', rejected: 'Татгалзсан',
    };

    return (
        <div className="print-only" style={S.page}>
            {/* ── HEADER ── */}
            <div style={{ textAlign: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '2px solid #000' }}>
                <div style={{ fontSize: '15pt', fontWeight: 'bold', letterSpacing: '2px' }}>АЖЛЫН АНКЕТ</div>
                <div style={{ fontSize: '9pt', marginTop: '4px', color: '#444' }}>
                    Илгээсэн: {a.created_at} &nbsp;|&nbsp; Статус: {STATUS_MN[a.status]}
                    {a.admin_notes && <span> &nbsp;|&nbsp; Тэмдэглэл: {a.admin_notes}</span>}
                </div>
            </div>

            {/* ── 1. ҮНДСЭН МЭДЭЭЛЭЛ ── */}
            <table style={S.tbl}>
                <thead>
                    <tr><th colSpan={4} style={S.secHead}>1. ҮНДСЭН МЭДЭЭЛЭЛ</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={S.lbl}>Овог</td><td style={S.val}>{a.last_name}</td>
                        <td style={S.lbl}>Нэр</td><td style={S.val}>{a.first_name}</td>
                    </tr>
                    {a.family_name && (
                        <tr>
                            <td style={S.lbl}>Ургийн овог</td>
                            <td colSpan={3} style={S.val}>{a.family_name}</td>
                        </tr>
                    )}
                    <tr>
                        <td style={S.lbl}>Хүйс</td><td style={S.val}>{a.gender ?? '—'}</td>
                        <td style={S.lbl}>Төрсөн огноо</td><td style={S.val}>{a.birth_date ?? '—'}</td>
                    </tr>
                    <tr>
                        <td style={S.lbl}>Төрсөн аймаг/хот</td><td style={S.val}>{a.birth_city ?? '—'}</td>
                        <td style={S.lbl}>Регистр №</td><td style={S.val}>{a.register_no ?? '—'}</td>
                    </tr>
                    <tr>
                        <td style={S.lbl}>НДД-тэй</td>
                        <td style={S.bool(a.has_insurance)}>{a.has_insurance ? 'Тийм ✓' : 'Үгүй'}</td>
                        <td style={S.lbl}>ЭМДД-тэй</td>
                        <td style={S.bool(a.has_health_insurance)}>{a.has_health_insurance ? 'Тийм ✓' : 'Үгүй'}</td>
                    </tr>
                    <tr>
                        <td style={S.lbl}>Жолооны үнэмлэх</td>
                        <td style={S.bool(a.has_driving_license)}>
                            {a.has_driving_license ? `Тийм ✓${a.driving_class ? ' — ' + a.driving_class + ' анги' : ''}` : 'Үгүй'}
                        </td>
                        <td style={S.lbl}>Хувийн машинтай</td>
                        <td style={S.bool(a.has_car)}>{a.has_car ? 'Тийм ✓' : 'Үгүй'}</td>
                    </tr>
                    <tr>
                        <td style={S.lbl}>Гар утас</td><td style={S.val}>{a.phone_mobile ?? '—'}</td>
                        <td style={S.lbl}>Гэрийн утас</td><td style={S.val}>{a.phone_home ?? '—'}</td>
                    </tr>
                    {a.email && (
                        <tr>
                            <td style={S.lbl}>Имэйл</td>
                            <td colSpan={3} style={S.val}>{a.email}</td>
                        </tr>
                    )}
                    {a.address && (
                        <tr>
                            <td style={S.lbl}>Гэрийн хаяг</td>
                            <td colSpan={3} style={S.val}>{a.address}</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* ── 2. БОЛОВСРОЛ ── */}
            {((a.education?.length ?? 0) > 0 || (a.professional_training?.length ?? 0) > 0) && (
                <table style={S.tbl}>
                    <thead>
                        <tr><th colSpan={6} style={S.secHead}>2. БОЛОВСРОЛ</th></tr>
                    </thead>
                    <tbody>
                        {(a.education?.length ?? 0) > 0 && (
                            <>
                                <tr>
                                    {['Сургуулийн нэр', 'Мэргэжил', 'Зэрэг', 'Элссэн', 'Төгссөн', 'GPA'].map(h => (
                                        <th key={h} style={S.subHead}>{h}</th>
                                    ))}
                                </tr>
                                {a.education?.map((e, i) => (
                                    <tr key={i}>
                                        <td style={S.cell}>{e.school}</td>
                                        <td style={S.cell}>{e.major}</td>
                                        <td style={S.cell}>{e.degree}</td>
                                        <td style={{ ...S.cell, textAlign: 'center', width: '60px' }}>{e.enrolled_year}</td>
                                        <td style={{ ...S.cell, textAlign: 'center', width: '60px' }}>{e.graduated_year}</td>
                                        <td style={{ ...S.cell, textAlign: 'center', width: '50px' }}>{e.gpa}</td>
                                    </tr>
                                ))}
                            </>
                        )}
                        {(a.professional_training?.length ?? 0) > 0 && (
                            <>
                                <tr><th colSpan={6} style={{ ...S.subHead, background: '#f0f0f0' }}>Мэргэшлийн сургалт</th></tr>
                                <tr>
                                    {['Байгуулга', 'Чиглэл', 'Огноо', 'Хугацаа', '', ''].map((h, i) => (
                                        <th key={i} style={S.subHead}>{h}</th>
                                    ))}
                                </tr>
                                {a.professional_training?.map((t, i) => (
                                    <tr key={i}>
                                        <td style={S.cell}>{t.organization}</td>
                                        <td style={S.cell}>{t.field}</td>
                                        <td style={S.cell}>{t.date}</td>
                                        <td style={S.cell}>{t.duration}</td>
                                        <td style={S.cell} colSpan={2}></td>
                                    </tr>
                                ))}
                            </>
                        )}
                    </tbody>
                </table>
            )}

            {/* ── 3. АЖЛЫН ТУРШЛАГА ── */}
            {(a.work_experience?.length ?? 0) > 0 && (
                <table style={{ ...S.tbl, pageBreakBefore: 'auto' as const }}>
                    <thead>
                        <tr><th colSpan={6} style={S.secHead}>3. АЖЛЫН ТУРШЛАГА</th></tr>
                    </thead>
                    <tbody>
                        {(a.total_work_years || a.employment_status) && (
                            <tr>
                                <td style={S.lbl}>Нийт туршлага</td>
                                <td style={S.val}>{a.total_work_years ? a.total_work_years + ' жил' : '—'}</td>
                                <td style={S.lbl}>Хөдөлмөр эрхлэлт</td>
                                <td colSpan={3} style={S.val}>{a.employment_status ?? '—'}</td>
                            </tr>
                        )}
                        <tr>
                            {['Байгуулга', 'Албан тушаал', 'Эхэлсэн', 'Дуусгасан', 'Үүрэг', 'Гарсан шалтгаан'].map(h => (
                                <th key={h} style={S.subHead}>{h}</th>
                            ))}
                        </tr>
                        {a.work_experience?.map((w, i) => (
                            <tr key={i}>
                                <td style={S.cell}>{w.organization}</td>
                                <td style={S.cell}>{w.position}</td>
                                <td style={{ ...S.cell, width: '56px', textAlign: 'center' }}>{w.start_date}</td>
                                <td style={{ ...S.cell, width: '56px', textAlign: 'center' }}>{w.end_date || 'Одоо'}</td>
                                <td style={S.cell}>{w.duties}</td>
                                <td style={S.cell}>{w.leave_reason}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* ── 4. УР ЧАДВАР ── */}
            <table style={S.tbl}>
                <thead>
                    <tr><th colSpan={7} style={S.secHead}>4. УР ЧАДВАР</th></tr>
                </thead>
                <tbody>
                    {(a.skills_languages?.length ?? 0) > 0 && (
                        <>
                            <tr><th colSpan={7} style={S.subHead}>Гадаад хэлний мэдлэг</th></tr>
                            <tr>
                                {['Хэл', 'Бичих', 'Ярих', 'Сонсох', 'Унших', 'Аман орчуулга', 'Бичгийн орчуулга'].map(h => (
                                    <th key={h} style={{ ...S.colHead, fontSize: '7.5pt' }}>{h}</th>
                                ))}
                            </tr>
                            {a.skills_languages?.map((l, i) => (
                                <tr key={i}>
                                    <td style={{ ...S.cell, fontWeight: 'bold' }}>{l.name}</td>
                                    {[l.write, l.speak, l.listen, l.read, l.interpret_oral, l.interpret_written].map((v, j) => (
                                        <td key={j} style={{ ...S.cell, textAlign: 'center' }}>{v || '—'}</td>
                                    ))}
                                </tr>
                            ))}
                        </>
                    )}
                    {a.skills_computer && (
                        <>
                            <tr><th colSpan={7} style={S.subHead}>Компьютерийн мэдлэг</th></tr>
                            <tr>
                                {(['MS Word', 'MS Excel', 'PowerPoint', 'MS Project', 'Access', 'Outlook', 'Internet'].map(h => (
                                    <th key={h} style={{ ...S.colHead, fontSize: '7.5pt' }}>{h}</th>
                                )))}
                            </tr>
                            <tr>
                                {[
                                    a.skills_computer.ms_word, a.skills_computer.ms_excel,
                                    a.skills_computer.ms_powerpoint, a.skills_computer.ms_project,
                                    a.skills_computer.access, a.skills_computer.outlook,
                                    a.skills_computer.internet,
                                ].map((v, i) => (
                                    <td key={i} style={{ ...S.cell, textAlign: 'center' }}>{v || '—'}</td>
                                ))}
                            </tr>
                            {a.skills_computer.other && (
                                <tr>
                                    <td style={S.lbl}>Бусад</td>
                                    <td colSpan={6} style={S.val}>{a.skills_computer.other}</td>
                                </tr>
                            )}
                        </>
                    )}
                    {(a.skills_talents?.length ?? 0) > 0 && (
                        <>
                            <tr><th colSpan={7} style={S.subHead}>Авьяас чадвар</th></tr>
                            <tr>
                                {['Авьяасын төрөл', 'Жил', 'Амжилт', '', '', '', ''].map((h, i) => (
                                    <th key={i} style={S.subHead}>{h}</th>
                                ))}
                            </tr>
                            {a.skills_talents?.map((t, i) => (
                                <tr key={i}>
                                    <td style={S.cell}>{t.type}</td>
                                    <td style={{ ...S.cell, textAlign: 'center', width: '50px' }}>{t.years}</td>
                                    <td style={S.cell} colSpan={5}>{t.achievement}</td>
                                </tr>
                            ))}
                        </>
                    )}
                </tbody>
            </table>

            {/* ── 5. ГАВЪЯА ШАГНАЛ ── */}
            {(a.awards?.length ?? 0) > 0 && (
                <table style={S.tbl}>
                    <thead>
                        <tr><th colSpan={3} style={S.secHead}>5. ГАВЪЯА ШАГНАЛ</th></tr>
                        <tr>
                            {['Он', 'Шагналын нэр', 'Тайлбар'].map(h => (
                                <th key={h} style={S.subHead}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {a.awards?.map((aw, i) => (
                            <tr key={i}>
                                <td style={{ ...S.cell, width: '50px', textAlign: 'center' }}>{aw.year}</td>
                                <td style={S.cell}>{aw.name}</td>
                                <td style={S.cell}>{aw.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* ── 6. ТОДОРХОЙЛОЛТ ── */}
            {(a.references?.length ?? 0) > 0 && (
                <table style={S.tbl}>
                    <thead>
                        <tr><th colSpan={4} style={S.secHead}>6. ТОДОРХОЙЛОЛТ</th></tr>
                        <tr>
                            {['Нэр', 'Холбоо', 'Утас', 'Ажил, мэргэжил'].map(h => (
                                <th key={h} style={S.subHead}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {a.references?.map((r, i) => (
                            <tr key={i}>
                                <td style={S.cell}>{r.name}</td>
                                <td style={S.cell}>{r.relation}</td>
                                <td style={S.cell}>{r.phone}</td>
                                <td style={S.cell}>{r.occupation}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* ── 7. ГЭР БҮЛ ── */}
            {((a.family_members?.length ?? 0) > 0 || (a.family_relatives?.length ?? 0) > 0) && (
                <table style={S.tbl}>
                    <thead>
                        <tr><th colSpan={5} style={S.secHead}>7. ГЭР БҮЛИЙН БАЙДАЛ</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={S.lbl}>Гэрлэсэн эсэх</td>
                            <td colSpan={4} style={S.bool(a.is_married)}>{a.is_married ? 'Гэрлэсэн ✓' : 'Гэрлээгүй'}</td>
                        </tr>
                        {(a.family_members?.length ?? 0) > 0 && (
                            <>
                                <tr><th colSpan={5} style={S.subHead}>Гэр бүлийн гишүүд</th></tr>
                                <tr>
                                    {['Нэр', 'Холбоо', 'Төрсөн он', 'Ажил, мэргэжил', 'Утас'].map(h => (
                                        <th key={h} style={S.colHead}>{h}</th>
                                    ))}
                                </tr>
                                {a.family_members?.map((m, i) => (
                                    <tr key={i}>
                                        <td style={S.cell}>{m.name}</td>
                                        <td style={S.cell}>{m.relation}</td>
                                        <td style={{ ...S.cell, textAlign: 'center' }}>{m.birth_year}</td>
                                        <td style={S.cell}>{m.occupation}</td>
                                        <td style={S.cell}>{m.phone}</td>
                                    </tr>
                                ))}
                            </>
                        )}
                        {(a.family_relatives?.length ?? 0) > 0 && (
                            <>
                                <tr><th colSpan={5} style={S.subHead}>Ураг төрлийн мэдээлэл</th></tr>
                                <tr>
                                    {['Нэр', 'Холбоо', 'Төрсөн он', 'Ажил, мэргэжил', 'Утас'].map(h => (
                                        <th key={h} style={S.colHead}>{h}</th>
                                    ))}
                                </tr>
                                {a.family_relatives?.map((r, i) => (
                                    <tr key={i}>
                                        <td style={S.cell}>{r.name}</td>
                                        <td style={S.cell}>{r.relation}</td>
                                        <td style={{ ...S.cell, textAlign: 'center' }}>{r.birth_year}</td>
                                        <td style={S.cell}>{r.occupation}</td>
                                        <td style={S.cell}>{r.phone}</td>
                                    </tr>
                                ))}
                            </>
                        )}
                    </tbody>
                </table>
            )}

            {/* ── 8. БУСАД ── */}
            <table style={S.tbl}>
                <thead>
                    <tr><th colSpan={2} style={S.secHead}>8. БУСАД МЭДЭЭЛЭЛ</th></tr>
                </thead>
                <tbody>
                    {a.health_status && (
                        <tr>
                            <td style={S.lbl}>Эрүүл мэндийн байдал</td>
                            <td style={S.val}>{a.health_status}</td>
                        </tr>
                    )}
                    {a.info_source && (
                        <tr>
                            <td style={S.lbl}>Мэдээлэл авсан эх сурвалж</td>
                            <td style={S.val}>{a.info_source}</td>
                        </tr>
                    )}
                    {a.goals_5years && (
                        <tr>
                            <td style={S.lbl}>Ойрын 5 жилийн зорилго</td>
                            <td style={{ ...S.val, whiteSpace: 'pre-wrap' as const }}>{a.goals_5years}</td>
                        </tr>
                    )}
                    {a.strengths && (
                        <tr>
                            <td style={S.lbl}>Давуу тал</td>
                            <td style={{ ...S.val, whiteSpace: 'pre-wrap' as const }}>{a.strengths}</td>
                        </tr>
                    )}
                    {a.weaknesses && (
                        <tr>
                            <td style={S.lbl}>Сул тал</td>
                            <td style={{ ...S.val, whiteSpace: 'pre-wrap' as const }}>{a.weaknesses}</td>
                        </tr>
                    )}
                    {a.additional_info && (
                        <tr>
                            <td style={S.lbl}>Нэмэлт танилцуулга</td>
                            <td style={{ ...S.val, whiteSpace: 'pre-wrap' as const }}>{a.additional_info}</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* ── FOOTER ── */}
            <div style={{ marginTop: '16px', borderTop: '1px solid #ccc', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#666' }}>
                <span>Анкет дугаар: #{a.id}</span>
                <span>Илгээсэн огноо: {a.created_at}</span>
                <span>Хэвлэсэн огноо: {new Date().toLocaleDateString('mn-MN')}</span>
            </div>
        </div>
    );
}

/* ── FamilyCard ─────────────────────────────────────────────────────── */
function FamilyCard({
    person, color,
}: {
    person: { name: string; relation: string; birth_year: string; occupation: string; phone: string };
    color: 'rose' | 'pink';
}) {
    const colorMap = {
        rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300',
        pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300',
    };
    return (
        <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${colorMap[color]}`}>
                {person.name ? person.name[0] : '?'}
            </div>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold truncate">{person.name}</p>
                    {person.relation && (
                        <span className="rounded-full bg-background border px-2 py-0.5 text-[11px] text-muted-foreground">
                            {person.relation}
                        </span>
                    )}
                </div>
                {person.birth_year && (
                    <p className="text-xs text-muted-foreground">{person.birth_year} он</p>
                )}
                {person.occupation && (
                    <p className="text-xs text-muted-foreground truncate">{person.occupation}</p>
                )}
                {person.phone && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Phone className="size-3" /> {person.phone}
                    </p>
                )}
            </div>
        </div>
    );
}
