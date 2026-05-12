import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle, Briefcase, ChevronLeft, CreditCard,
    DollarSign, FileText, Heart, LogOut, Pencil, Phone, Trash2, User, Users,
} from 'lucide-react';

interface Contract {
    id: number; contract_type: string;
    start_date: string | null; end_date: string | null;
    notes: string | null; days_until_expiry: number | null;
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
    if (days < 0)   return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700"><AlertTriangle className="size-3" />Дууссан</span>;
    if (days <= 7)  return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700"><AlertTriangle className="size-3" />{days} хоног</span>;
    if (days <= 30) return <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700"><AlertTriangle className="size-3" />{days} хоног</span>;
    if (days <= 90) return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">{days} хоног</span>;
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">{days} хоног</span>;
}

function Row({ label, value }: { label: string; value?: string | null | boolean }) {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div className="flex items-start gap-2 border-b border-border/50 py-2 last:border-0">
            <span className="w-36 shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-foreground">
                {typeof value === 'boolean' ? (value ? 'Тийм' : 'Үгүй') : value}
            </span>
        </div>
    );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b pb-3">
                <div className="flex size-7 items-center justify-center rounded-lg bg-red-50">
                    <Icon className="size-4 text-red-600" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
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

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.visit('/hr/employees')}
                            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <ChevronLeft className="size-4" /> Буцах
                        </button>
                        <div className="flex items-center gap-4">
                            {e.photo_url
                                ? <img src={e.photo_url} className="size-16 rounded-full object-cover ring-2 ring-background shadow" alt="" />
                                : <div className="flex size-16 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600 ring-2 ring-background shadow">
                                    {e.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                            }
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold text-foreground">{e.full_name}</h1>
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                        e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {e.status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                                    </span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground">
                                    <span>{e.employee_number}</span>
                                    {e.position && <><span>·</span><span>{e.position}</span></>}
                                    {e.branch && <><span>·</span><span>{e.branch}</span></>}
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Phone className="size-3.5" /> {e.phone}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {exit_checklist_id ? (
                            <Link href={`/hr/exit-checklists/${exit_checklist_id}`}
                                className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                                <LogOut className="size-4" /> Гарах бүртгэл
                            </Link>
                        ) : e.status === 'active' && (
                            <Link href={`/hr/exit-checklists/create?employee_id=${e.id}`}
                                className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                                <LogOut className="size-4" /> Гарах бүртгэл эхлүүлэх
                            </Link>
                        )}
                        <button
                            onClick={() => router.visit(`/hr/employees/${e.id}/edit`)}
                            className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background hover:opacity-80 transition-opacity"
                        >
                            <Pencil className="size-4" /> Засах
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm(`"${e.full_name}" ажилтныг устгах уу? Эмчийн бүртгэл болон нэвтрэх эрх хамт устгагдана.`)) {
                                    router.delete(`/hr/employees/${e.id}`);
                                }
                            }}
                            className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                            <Trash2 className="size-4" /> Устгах
                        </button>
                    </div>
                </div>

                {/* Сануулга */}
                {warnings.length > 0 && (
                    <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-orange-700">
                            <AlertTriangle className="size-4" /> Анхааруулга
                        </div>
                        <div className="space-y-1.5">
                            {warnings.map((w, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-orange-700">{w.label}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-orange-500">{w.date}</span>
                                        {expiryBadge(w.days)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">

                    {/* Хувийн мэдээлэл */}
                    <Section title="Хувийн мэдээлэл" icon={User}>
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
                    <Section title="Холбоо барих" icon={Phone}>
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
                    <Section title="Ажлын мэдээлэл" icon={Briefcase}>
                        <Row label="Салбар"         value={e.branch} />
                        <Row label="Тушаал"         value={e.position} />
                        <Row label="Цалин"          value={`${Number(e.salary).toLocaleString()}₮`} />
                        <Row label="Ажилд орсон"    value={e.hired_date} />
                        <Row label="Туршилт дуусах" value={e.probation_end_date} />
                        <Row label="Статус"         value={e.status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'} />
                        {e.notes && <Row label="Тэмдэглэл" value={e.notes} />}
                    </Section>

                    {/* Санхүү */}
                    <Section title="Санхүүгийн мэдээлэл" icon={CreditCard}>
                        <Row label="Банк"          value={e.bank_name} />
                        <Row label="Дансны дугаар" value={e.bank_account} />
                        <Row label="Дансны нэр"    value={e.bank_account_name} />
                        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                            <p><strong>НДШ:</strong> {Math.round(e.salary * 0.1).toLocaleString()}₮ (10%)</p>
                            <p><strong>ХАОАТ:</strong> {Math.round(e.salary * 0.1).toLocaleString()}₮ (10%)</p>
                            <p className="mt-1 font-semibold">Гарт авах: {Math.round(e.salary * 0.8).toLocaleString()}₮</p>
                        </div>
                    </Section>

                    {/* Гэрээ */}
                    <Section title="Хөдөлмөрийн гэрээ" icon={FileText}>
                        {e.contracts.length === 0
                            ? <p className="text-sm italic text-muted-foreground">Гэрээ бүртгэгдээгүй</p>
                            : e.contracts.map(c => (
                                <div key={c.id} className="mb-3 rounded-lg border bg-muted/30 p-3 last:mb-0">
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-foreground">
                                            {c.contract_type === 'fixed' ? 'Тодорхой хугацаатай' : 'Тодорхойгүй хугацаатай'}
                                        </span>
                                        {expiryBadge(c.days_until_expiry)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {c.start_date} {c.end_date ? `→ ${c.end_date}` : '(дуусах огноогүй)'}
                                    </div>
                                    {c.notes && <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>}
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
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">HR портал</span>
                            </div>
                        </div>
                    </Section>
                </div>

                {/* Цалингийн задаргаа */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50">
                                <DollarSign className="size-4 text-emerald-600" />
                            </div>
                            <h3 className="text-sm font-bold text-foreground">Цалингийн задаргаа</h3>
                        </div>
                        <a href="/hr/payroll"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Бүгдийг харах →
                        </a>
                    </div>

                    {payrollHistory.length === 0 ? (
                        <p className="text-sm italic text-muted-foreground">Цалингийн мэдээлэл байхгүй байна.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr className="border-b bg-muted/20 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
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
        </AppLayout>
    );
}
