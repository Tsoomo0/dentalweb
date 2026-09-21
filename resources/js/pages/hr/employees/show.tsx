import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle, Briefcase, ChevronLeft, CreditCard,
    DollarSign, FileText, Heart, LogOut, Pencil, Phone, ShieldCheck, Trash2, User, Users,
    type LucideIcon,
} from 'lucide-react';
import { HR_PANEL_FX } from '@/components/hr/document-status';
import { HrButton, HrGhostButton, HrPanel } from '@/components/hr/page-panel';

interface Contract {
    id: number; contract_type: string; title: string | null;
    start_date: string | null; end_date: string | null;
    notes: string | null; days_until_expiry: number | null;
    document_id: number | null; document_type_label: string | null;
    document_number: string | null; employer_name: string | null;
    employer_signed_at: string | null; employee_signed_at: string | null;
    file_url: string | null;
}
interface License {
    id: number; name: string; issuer: string | null;
    start_date: string | null; end_date: string | null;
    notes: string | null; days_until_expiry: number | null;
}
interface FamilyMember {
    id: number; last_name: string; first_name: string;
    phone: string | null; relationship: string;
    birth_date: string | null; employment_status: string | null;
}
interface Employee {
    id: number; employee_number: string; photo_url: string | null;
    last_name: string; first_name: string; full_name: string;
    register_number: string; birth_date: string | null; gender: string;
    family_name: string | null; ethnicity: string | null;
    birth_place: string | null; blood_type: string | null;
    driver_license: string | null; military_service: boolean;
    education_degree: string | null; education_school: string | null; education_major: string | null;
    phone: string; email: string | null; address: string | null;
    emergency_name: string | null; emergency_phone: string | null; emergency_relation: string | null;
    branch: string | null; position: string | null;
    salary: number; hired_date: string | null; probation_end_date: string | null;
    status: 'active' | 'inactive';
    bank_name: string | null; bank_account: string | null; bank_account_name: string | null;
    is_married: boolean; has_children: boolean; children_count: number;
    notes: string | null;
    extra_portals: string[]; schedule_permissions: string[];
    contracts: Contract[]; licenses: License[]; family_members: FamilyMember[];
}

interface PayrollHistoryRow {
    run_id: number; run_title: string; status: 'draft' | 'final';
    basic_salary: number; calc_salary: number;
    net_hand: number; bank_salary: number;
    ndsh: number; income_tax: number;
}

interface Props { employee: Employee; payrollHistory: PayrollHistoryRow[]; exit_checklist_id: number | null }

// ── Helpers ───────────────────────────────────────────────────────────────────

function expiryBadge(days: number | null) {
    if (days === null) return null;

    const pill = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset';

    if (days < 0) return <span className={`${pill} bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60`}><AlertTriangle className="size-3" />Дууссан</span>;
    if (days <= 7) return <span className={`${pill} bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60`}><AlertTriangle className="size-3" />{days} хоног</span>;
    if (days <= 30) return <span className={`${pill} bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/60`}><AlertTriangle className="size-3" />{days} хоног</span>;
    if (days <= 90) return <span className={`${pill} bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60`}>{days} хоног</span>;

    return <span className={`${pill} bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60`}>{days} хоног</span>;
}

function Row({ label, value }: { label: string; value?: string | null | boolean }) {
    if (value === null || value === undefined || value === '') return null;

    return (
        <div className="flex items-start gap-3 border-b border-border/40 py-2 last:border-0">
            <span className="w-32 shrink-0 text-[11px] leading-5 text-muted-foreground">{label}</span>
            <span className="min-w-0 flex-1 text-[13px] font-medium leading-5 text-foreground">
                {typeof value === 'boolean' ? (value ? 'Тийм' : 'Үгүй') : value}
            </span>
        </div>
    );
}

function Section({ title, icon: Icon, tone = 'rose', action, children }: {
    title: string;
    icon: LucideIcon;
    /** Дүрсний градиент өнгө */
    tone?: 'rose' | 'sky' | 'violet' | 'emerald' | 'amber' | 'indigo';
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    const TONE: Record<string, string> = {
        rose: 'from-rose-400 to-red-600 shadow-rose-600/30',
        sky: 'from-sky-400 to-cyan-600 shadow-sky-600/30',
        violet: 'from-violet-400 to-purple-600 shadow-violet-600/30',
        emerald: 'from-emerald-400 to-teal-600 shadow-emerald-600/30',
        amber: 'from-amber-400 to-orange-600 shadow-amber-600/30',
        indigo: 'from-indigo-400 to-violet-600 shadow-indigo-600/30',
    };

    return (
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-20px_rgba(0,0,0,0.25)] transition-shadow hover:shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div className="flex min-w-0 items-center gap-2">
                    <span className={`relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm ring-1 ring-inset ring-white/25 ${TONE[tone]}`}>
                        <Icon className="size-3.5" />
                    </span>
                    <h3 className="truncate text-[13px] font-bold text-foreground">{title}</h3>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
    if (!n) return '—';
    return n.toLocaleString('mn-MN', { maximumFractionDigits: 0 }) + '₮';
}

const PORTAL_LABELS: Record<string, string> = {
    reception: 'Ресепшн портал',
    lab: 'Лаб портал',
    hr: 'HR портал',
};

const SCHEDULE_LABELS: Record<string, string> = {
    clinic: 'Эмч сувилагчийн хуваарь',
    ortho: 'Гажиг засал / туслах эмчийн хуваарь',
    xray: 'Рентген техникчийн хуваарь',
    sterile: 'Ариутгалын сувилагчийн хуваарь',
    reception: 'Ресепшний хуваарь',
    cleaner: 'Үйлчлэгчийн хуваарь',
    technician: 'Шүдний техникчийн хуваарь',
};

export default function ShowEmployee({ employee: e, payrollHistory, exit_checklist_id }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'HR', href: '/hr/employees' },
        { title: 'Ажилтнууд', href: '/hr/employees' },
        { title: e.full_name, href: `/hr/employees/${e.id}` },
    ];

    const warnings = [
        ...e.contracts
            .filter(c => c.days_until_expiry !== null && c.days_until_expiry <= 90)
            .map(c => ({ label: 'Гэрээ дуусах гэж байна', days: c.days_until_expiry!, date: c.end_date })),
        ...e.licenses
            .filter(l => l.days_until_expiry !== null && l.days_until_expiry <= 90)
            .map(l => ({ label: `Лиценз: ${l.name}`, days: l.days_until_expiry!, date: l.end_date })),
        ...(e.probation_end_date ? [{
            label: 'Туршилтын хугацаа дуусах гэж байна',
            days: Math.ceil((new Date(e.probation_end_date).getTime() - Date.now()) / 86400000),
            date: e.probation_end_date,
        }].filter(w => w.days <= 14 && w.days >= 0) : []),
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={e.full_name} />

            <div className="flex h-full flex-1 flex-col gap-3 p-4 md:p-5">

                <HrPanel
                    tone="rose"
                    title={e.full_name}
                    avatar={
                        <span className="relative shrink-0">
                            {e.photo_url
                                ? <img src={e.photo_url} alt=""
                                    className="size-12 rounded-2xl object-cover object-top shadow-lg ring-1 ring-inset ring-black/5 dark:ring-white/10" />
                                : <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 via-rose-500 to-red-600 text-base font-black text-white shadow-lg shadow-rose-600/35 ring-1 ring-inset ring-white/30">
                                    {e.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                </span>}
                            <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card ${
                                e.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        </span>
                    }
                    badge={
                        <span className={`inline-flex items-center gap-1 ${
                            e.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                            <span className={`size-1.5 rounded-full ${e.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                            {e.status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                        </span>
                    }
                    subtitle={
                        <>
                            <span className="font-semibold text-foreground">{e.employee_number}</span>
                            {e.position && <><span className="text-muted-foreground/40">·</span><span>{e.position}</span></>}
                            {e.branch && <><span className="text-muted-foreground/40">·</span><span>{e.branch}</span></>}
                            <span className="text-muted-foreground/40">·</span>
                            <span className="inline-flex items-center gap-1 tabular-nums"><Phone className="size-3" />{e.phone}</span>
                        </>
                    }
                    actions={
                        <>
                            <HrGhostButton icon={ChevronLeft} onClick={() => router.visit('/hr/employees')} title="Жагсаалт руу буцах">
                                Буцах
                            </HrGhostButton>

                            {exit_checklist_id ? (
                                <HrGhostButton icon={LogOut} href={`/hr/exit-checklists/${exit_checklist_id}`} title="Гарах бүртгэл">
                                    Гарах бүртгэл
                                </HrGhostButton>
                            ) : e.status === 'active' && (
                                <HrGhostButton icon={LogOut} href={`/hr/exit-checklists/create?employee_id=${e.id}`} title="Гарах бүртгэл эхлүүлэх">
                                    Гарах бүртгэл
                                </HrGhostButton>
                            )}

                            <HrButton tone="rose" icon={Pencil} onClick={() => router.visit(`/hr/employees/${e.id}/edit`)}>
                                Засах
                            </HrButton>

                            <button
                                title="Ажилтныг устгах"
                                onClick={() => {
                                    if (window.confirm(`"${e.full_name}" ажилтныг устгах уу? Эмчийн бүртгэл болон нэвтрэх эрх хамт устгагдана.`)) {
                                        router.delete(`/hr/employees/${e.id}`);
                                    }
                                }}
                                className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-red-500 shadow-sm backdrop-blur transition-all hover:-translate-y-px hover:bg-red-50 active:translate-y-0 active:scale-[0.97] dark:hover:bg-red-950/30">
                                <Trash2 className="size-3.5" />
                            </button>
                        </>
                    }
                />

                {/* Сануулга */}
                {warnings.length > 0 && (
                    <div className="rounded-2xl border border-amber-300/70 bg-gradient-to-br from-amber-50/80 via-card to-orange-50/50 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-20px_rgba(245,158,11,0.4)] dark:border-amber-900/60 dark:from-amber-950/30 dark:via-card dark:to-orange-950/20">
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-sm ring-1 ring-inset ring-white/25">
                                <AlertTriangle className="size-3.5" />
                            </span>
                            <p className="text-[13px] font-bold text-foreground">Анхааруулга</p>
                        </div>
                        <div className="space-y-1">
                            {warnings.map((w, i) => (
                                <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-[13px] transition-colors hover:bg-amber-500/5">
                                    <span className="text-foreground">{w.label}</span>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <span className="text-[11px] tabular-nums text-muted-foreground">{w.date}</span>
                                        {expiryBadge(w.days)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">

                    {/* Хувийн мэдээлэл */}
                    <Section title="Хувийн мэдээлэл" icon={User} tone="rose">
                        <Row label="Овог нэр"       value={e.full_name} />
                        <Row label="Регистр"        value={e.register_number} />
                        <Row label="Төрсөн огноо"   value={e.birth_date} />
                        <Row label="Хүйс"           value={e.gender === 'male' ? 'Эрэгтэй' : 'Эмэгтэй'} />
                        <Row label="Ургийн овог"    value={e.family_name} />
                        <Row label="Яс үндэс"       value={e.ethnicity} />
                        <Row label="Төрсөн газар"   value={e.birth_place} />
                        <Row label="Цусны бүлэг"   value={e.blood_type} />
                        <Row label="Жолооны ангилал" value={e.driver_license} />
                        <Row label="Цэргийн алба"   value={e.military_service} />
                        <Row label="Боловсрол"      value={e.education_degree} />
                        <Row label="Сургууль"       value={e.education_school} />
                        <Row label="Мэргэжил"       value={e.education_major} />
                    </Section>

                    {/* Холбоо барих */}
                    <Section title="Холбоо барих" icon={Phone} tone="sky">
                        <Row label="Утас"  value={e.phone} />
                        <Row label="Имэйл" value={e.email} />
                        <Row label="Хаяг"  value={e.address} />
                        {(e.emergency_name || e.emergency_phone) && (
                            <div className="mt-3 rounded-lg bg-muted/50 p-3">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                    Яаралтай холбоо барих
                                </p>
                                <Row label="Нэр"      value={e.emergency_name} />
                                <Row label="Утас"     value={e.emergency_phone} />
                                <Row label="Хамаарал" value={e.emergency_relation} />
                            </div>
                        )}
                    </Section>

                    {/* Ажлын мэдээлэл */}
                    <Section title="Ажлын мэдээлэл" icon={Briefcase} tone="amber">
                        <Row label="Салбар"         value={e.branch} />
                        <Row label="Тушаал"         value={e.position} />
                        <Row label="Цалин"          value={`${Number(e.salary).toLocaleString()}₮`} />
                        <Row label="Ажилд орсон"    value={e.hired_date} />
                        <Row label="Туршилт дуусах" value={e.probation_end_date} />
                        <Row label="Статус"         value={e.status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'} />
                        {e.notes && <Row label="Тэмдэглэл" value={e.notes} />}
                    </Section>

                    {/* Санхүү */}
                    <Section title="Санхүүгийн мэдээлэл" icon={CreditCard} tone="emerald">
                        <Row label="Банк"          value={e.bank_name} />
                        <Row label="Дансны дугаар" value={e.bank_account} />
                        <Row label="Дансны нэр"    value={e.bank_account_name} />
                    </Section>

                    {/* Гэрээ */}
                    <Section title="Хөдөлмөрийн гэрээ" icon={FileText} tone="indigo">
                        {e.contracts.length === 0
                            ? <p className="text-sm italic text-muted-foreground">Гэрээ бүртгэгдээгүй</p>
                            : e.contracts.map(c => (
                                <div key={c.id} className="mb-3 rounded-lg border bg-muted/30 p-3 last:mb-0">
                                    <div className="mb-1.5 flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold text-foreground">
                                            {c.title || c.document_type_label || (c.contract_type === 'fixed' ? 'Тодорхой хугацаатай' : 'Тодорхойгүй хугацаатай')}
                                        </span>
                                        {expiryBadge(c.days_until_expiry)}
                                    </div>
                                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60">
                                            {c.contract_type === 'fixed' ? 'Тодорхой хугацаатай' : 'Тодорхойгүй хугацаатай'}
                                        </span>
                                        {c.document_id && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                                                <ShieldCheck className="size-3" />2 тал гарын үсэг зурсан
                                            </span>
                                        )}
                                        {c.document_number && (
                                            <span className="text-[10px] font-semibold text-muted-foreground">№{c.document_number}</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {c.start_date} {c.end_date ? `→ ${c.end_date}` : '(дуусах огноогүй)'}
                                    </div>
                                    {c.employee_signed_at && (
                                        <div className="mt-1 text-[11px] text-muted-foreground">
                                            Ажилтан {c.employee_signed_at}
                                            {c.employer_signed_at ? ` · ${c.employer_name ?? 'Захирал'} ${c.employer_signed_at}` : ''}
                                        </div>
                                    )}
                                    {c.notes && <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>}
                                    {(c.document_id || c.file_url) && (
                                        <a href={c.document_id ? `/hr/employee-documents/${c.document_id}/pdf?inline=1` : c.file_url!}
                                            target="_blank" rel="noopener"
                                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                                            <FileText className="size-3.5" />
                                            {c.document_id ? 'Гэрээг харах (PDF)' : 'Хавсаргасан файл'}
                                        </a>
                                    )}
                                </div>
                            ))
                        }
                    </Section>

                    {/* Лиценз */}
                    <Section title="Лиценз / Гэрчилгээ" icon={FileText}>
                        {e.licenses.length === 0
                            ? <p className="text-sm italic text-muted-foreground">Лиценз бүртгэгдээгүй</p>
                            : e.licenses.map(l => (
                                <div key={l.id} className="mb-3 rounded-lg border bg-muted/30 p-3 last:mb-0">
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-foreground">{l.name}</span>
                                        {expiryBadge(l.days_until_expiry)}
                                    </div>
                                    {l.issuer && <div className="mb-1 text-xs text-muted-foreground">{l.issuer}</div>}
                                    <div className="text-xs text-muted-foreground">
                                        {l.start_date} {l.end_date ? `→ ${l.end_date}` : ''}
                                    </div>
                                    {l.notes && <p className="mt-1 text-xs text-muted-foreground">{l.notes}</p>}
                                </div>
                            ))
                        }
                    </Section>

                    {/* Гэр бүл */}
                    <Section title="Гэр бүл" icon={Heart}>
                        <div className="mb-3 flex gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                e.is_married ? 'bg-pink-100 text-pink-700' : 'bg-muted text-muted-foreground'
                            }`}>
                                {e.is_married ? 'Гэрлэсэн' : 'Гэрлээгүй'}
                            </span>
                            {e.has_children && (
                                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                    {e.children_count} хүүхэдтэй
                                </span>
                            )}
                        </div>
                        {e.family_members.length === 0
                            ? <p className="text-sm italic text-muted-foreground">Гэр бүлийн мэдээлэл байхгүй</p>
                            : e.family_members.map(f => (
                                <div key={f.id} className="mb-2 rounded-lg bg-muted/40 p-3 last:mb-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-foreground">{f.last_name} {f.first_name}</span>
                                        <span className="rounded-full border bg-card px-2 py-0.5 text-xs text-muted-foreground">{f.relationship}</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                        {f.phone && <span>{f.phone}</span>}
                                        {f.birth_date && <span>{f.birth_date}</span>}
                                        {f.employment_status && <span>{f.employment_status}</span>}
                                    </div>
                                </div>
                            ))
                        }
                    </Section>

                    {/* Нэвтрэх эрх */}
                    <Section title="Нэвтрэх эрх" icon={Users}>
                        <div className="rounded-lg bg-muted/50 p-3 text-sm">
                            <p className="mb-2 text-muted-foreground">Ажилтан доорх порталуудад нэвтэрч болно:</p>
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Ажлын портал</span>
                                {e.extra_portals.map(p => (
                                    <span key={p} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                        {PORTAL_LABELS[p] ?? p}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {e.schedule_permissions.length > 0 && (
                            <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                                <p className="mb-2 text-muted-foreground">Хуваарь гаргах эрх:</p>
                                <div className="flex flex-wrap gap-2">
                                    {e.schedule_permissions.map(p => (
                                        <span key={p} className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                                            {SCHEDULE_LABELS[p] ?? p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Section>
                </div>

                {/* Цалингийн задаргаа */}
                <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-20px_rgba(0,0,0,0.25)]">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-sm ring-1 ring-inset ring-white/25">
                                <DollarSign className="size-3.5" />
                            </span>
                            <h3 className="text-[13px] font-bold text-foreground">Цалингийн задаргаа</h3>
                        </div>
                        <a href="/hr/payroll"
                            className="flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                            Бүгдийг харах →
                        </a>
                    </div>

                    {payrollHistory.length === 0 ? (
                        <p className="text-sm italic text-muted-foreground">Цалингийн мэдээлэл байхгүй байна.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-border/60 bg-gradient-to-b from-muted/70 to-muted/25 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                                        <th className="px-3 py-2 text-left">Цалин</th>
                                        <th className="px-3 py-2 text-right">Үндсэн цалин</th>
                                        <th className="px-3 py-2 text-right">Тооцсон цалин</th>
                                        <th className="px-3 py-2 text-right">НДШ</th>
                                        <th className="px-3 py-2 text-right">ХХОАТ</th>
                                        <th className="px-3 py-2 text-right font-bold text-emerald-700">Гарт олгох</th>
                                        <th className="px-3 py-2 text-right font-bold text-emerald-700">Банкаар</th>
                                        <th className="px-3 py-2 text-center">Статус</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {payrollHistory.map(p => (
                                        <tr key={p.run_id} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-3 py-2">
                                                <a href={`/hr/payroll/${p.run_id}`}
                                                    className="font-medium text-foreground hover:underline">
                                                    {p.run_title}
                                                </a>
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtMoney(p.basic_salary)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtMoney(p.calc_salary)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtMoney(p.ndsh)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtMoney(p.income_tax)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700">{fmtMoney(p.net_hand)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700">{fmtMoney(p.bank_salary)}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                    p.status === 'final'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {p.status === 'final' ? 'Баталгаажсан' : 'Ноорог'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        <style>{HR_PANEL_FX}</style>
        </AppLayout>
    );
}
