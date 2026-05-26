import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Briefcase, ChevronLeft, ChevronRight, CreditCard,
    FileText, Heart, Plus, Save, Trash2, User, Users,
} from 'lucide-react';
import { useState } from 'react';

interface Branch   { id: number; name: string }
interface Position { id: number; name: string; portal: string; department: string | null }

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
    last_name: string; first_name: string;
    register_number: string; birth_date: string | null; gender: string;
    family_name: string | null; ethnicity: string | null;
    birth_place: string | null; blood_type: string | null;
    driver_license: string | null; military_service: boolean;
    education_degree: string | null; education_school: string | null; education_major: string | null;
    phone: string; email: string | null; address: string | null;
    emergency_name: string | null; emergency_phone: string | null; emergency_relation: string | null;
    branch_id: number | null; position_id: number | null;
    extra_portals: string[];
    salary: number; hired_date: string | null; probation_end_date: string | null;
    status: 'active' | 'inactive';
    vacation_days: number; vacation_extra_days: number;
    bank_name: string | null; bank_account: string | null; bank_account_name: string | null;
    is_married: boolean; has_children: boolean; children_count: number;
    notes: string | null;
    contracts: Contract[]; licenses: License[]; family_members: FamilyMember[];
}

interface EditableLicense { name: string; issuer: string; start_date: string; end_date: string; notes: string }
interface EditableFamily  { last_name: string; first_name: string; phone: string; relationship: string; birth_date: string; employment_status: string }

interface Props { employee: Employee; branches: Branch[]; positions: Position[] }

const TABS = [
    { key: 'personal', label: 'Хувийн мэдээлэл',  icon: User },
    { key: 'contact',  label: 'Холбоо барих',      icon: Users },
    { key: 'work',     label: 'Ажлын мэдээлэл',    icon: Briefcase },
    { key: 'docs',     label: 'Гэрээ & Лиценз',    icon: FileText },
    { key: 'finance',  label: 'Санхүү',             icon: CreditCard },
    { key: 'family',   label: 'Гэр бүл',            icon: Heart },
] as const;

type TabKey = typeof TABS[number]['key'];

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
                {label}{required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
            {children}
        </div>
    );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-muted"
        />
    );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
        >
            {children}
        </select>
    );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            rows={3}
            {...props}
            className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
        />
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="mb-4 border-b pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {children}
        </h3>
    );
}

function expiryColor(days: number | null) {
    if (days === null)  return 'text-muted-foreground';
    if (days <= 7)      return 'text-red-600 font-semibold';
    if (days <= 30)     return 'text-orange-500 font-semibold';
    if (days <= 90)     return 'text-yellow-600';
    return 'text-green-600';
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function EditEmployee({ employee, branches, positions }: Props) {
    const [tab, setTab]           = useState<TabKey>('personal');
    const [processing, setProcessing] = useState(false);
    const [newPhoto, setNewPhoto] = useState<File | null>(null);

    const [form, setForm] = useState({
        last_name:          employee.last_name,
        first_name:         employee.first_name,
        register_number:    employee.register_number,
        birth_date:         employee.birth_date ?? '',
        gender:             employee.gender,
        family_name:        employee.family_name ?? '',
        ethnicity:          employee.ethnicity ?? '',
        birth_place:        employee.birth_place ?? '',
        blood_type:         employee.blood_type ?? '',
        driver_license:     employee.driver_license ?? '',
        military_service:   employee.military_service,
        education_degree:   employee.education_degree ?? '',
        education_school:   employee.education_school ?? '',
        education_major:    employee.education_major ?? '',
        phone:              employee.phone,
        email:              employee.email ?? '',
        address:            employee.address ?? '',
        emergency_name:     employee.emergency_name ?? '',
        emergency_phone:    employee.emergency_phone ?? '',
        emergency_relation: employee.emergency_relation ?? '',
        branch_id:          String(employee.branch_id ?? ''),
        position_id:        String(employee.position_id ?? ''),
        extra_portals:      (employee.extra_portals ?? []) as string[],
        salary:             String(employee.salary),
        hired_date:         employee.hired_date ?? '',
        probation_end_date: employee.probation_end_date ?? '',
        status:             employee.status,
        vacation_extra_days: employee.vacation_extra_days ?? 0,
        bank_name:          employee.bank_name ?? '',
        bank_account:       employee.bank_account ?? '',
        bank_account_name:  employee.bank_account_name ?? '',
        is_married:         employee.is_married,
        has_children:       employee.has_children,
        children_count:     employee.children_count,
        notes:              employee.notes ?? '',
    });

    const [newLicenses, setNewLicenses] = useState<EditableLicense[]>([]);
    const [newFamily, setNewFamily]     = useState<EditableFamily[]>([]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'HR', href: '/hr/employees' },
        { title: 'Ажилтнууд', href: '/hr/employees' },
        { title: `${employee.last_name} ${employee.first_name}`, href: `/hr/employees/${employee.id}` },
        { title: 'Засах', href: `/hr/employees/${employee.id}/edit` },
    ];

    const tabIdx = TABS.findIndex(t => t.key === tab);

    function set(k: string, v: any) { setForm(prev => ({ ...prev, [k]: v })); }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setProcessing(true);
        const fd = new FormData();
        fd.append('_method', 'PUT');
        Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
        if (newPhoto) fd.append('photo', newPhoto);
        newLicenses.forEach((l, i) => Object.entries(l).forEach(([k, v]) => fd.append(`licenses[${i}][${k}]`, v)));
        newFamily.forEach((f, i) => Object.entries(f).forEach(([k, v]) => fd.append(`family_members[${i}][${k}]`, v)));
        router.post(`/hr/employees/${employee.id}`, fd as any, {
            onFinish: () => setProcessing(false),
        });
    }

    function addLicense() { setNewLicenses(p => [...p, { name: '', issuer: '', start_date: '', end_date: '', notes: '' }]); }
    function removeLicense(i: number) { setNewLicenses(p => p.filter((_, idx) => idx !== i)); }
    function updateLicense(i: number, k: keyof EditableLicense, v: string) { setNewLicenses(p => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l)); }

    function addFamily() { setNewFamily(p => [...p, { last_name: '', first_name: '', phone: '', relationship: '', birth_date: '', employment_status: '' }]); }
    function removeFamily(i: number) { setNewFamily(p => p.filter((_, idx) => idx !== i)); }
    function updateFamily(i: number, k: keyof EditableFamily, v: string) { setNewFamily(p => p.map((f, idx) => idx === i ? { ...f, [k]: v } : f)); }

    const photoPreview = newPhoto ? URL.createObjectURL(newPhoto) : employee.photo_url;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${employee.last_name} ${employee.first_name} — Засах`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.visit(`/hr/employees/${employee.id}`)}
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                        <ChevronLeft className="size-4" /> Буцах
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">
                            {employee.last_name} {employee.first_name} — Засах
                        </h1>
                        <p className="text-sm text-muted-foreground">{employee.employee_number}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
                    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">

                        {/* Tabs */}
                        <div className="flex overflow-x-auto border-b bg-muted/30">
                            {TABS.map((t, i) => {
                                const Icon = t.icon;
                                const active = tab === t.key;
                                return (
                                    <button
                                        key={t.key} type="button" onClick={() => setTab(t.key)}
                                        className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                                            active
                                                ? 'border-red-600 bg-card text-red-600'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className="size-3.5" />
                                        <span className="hidden sm:block">{t.label}</span>
                                        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground sm:hidden">
                                            {i + 1}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">

                            {/* ── 1. ХУВИЙН МЭДЭЭЛЭЛ ── */}
                            {tab === 'personal' && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-6">
                                        <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-muted/30">
                                            {photoPreview
                                                ? <img src={photoPreview} className="size-24 object-cover" alt="" />
                                                : <span className="text-3xl text-muted-foreground">👤</span>
                                            }
                                        </div>
                                        <div>
                                            <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                                                Зураг солих
                                                <input type="file" accept="image/*" className="hidden"
                                                    onChange={e => setNewPhoto(e.target.files?.[0] ?? null)} />
                                            </label>
                                            <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG · Дээд тал 2MB</p>
                                        </div>
                                    </div>

                                    <SectionTitle>Үндсэн мэдээлэл</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Овог" required><Input value={form.last_name} onChange={e => set('last_name', e.target.value)} /></Field>
                                        <Field label="Нэр" required><Input value={form.first_name} onChange={e => set('first_name', e.target.value)} /></Field>
                                        <Field label="Регистрийн дугаар" required><Input value={form.register_number} onChange={e => set('register_number', e.target.value)} /></Field>
                                        <Field label="Төрсөн огноо" required><Input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} /></Field>
                                        <Field label="Хүйс" required>
                                            <Select value={form.gender} onChange={e => set('gender', e.target.value)}>
                                                <option value="">— Сонгоно уу —</option>
                                                <option value="male">Эрэгтэй</option>
                                                <option value="female">Эмэгтэй</option>
                                            </Select>
                                        </Field>
                                        <Field label="Ургийн овог"><Input value={form.family_name} onChange={e => set('family_name', e.target.value)} /></Field>
                                    </div>

                                    <SectionTitle>Нэмэлт мэдээлэл</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Яс үндэс"><Input value={form.ethnicity} onChange={e => set('ethnicity', e.target.value)} /></Field>
                                        <Field label="Төрсөн газар"><Input value={form.birth_place} onChange={e => set('birth_place', e.target.value)} /></Field>
                                        <Field label="Цусны бүлэг">
                                            <Select value={form.blood_type} onChange={e => set('blood_type', e.target.value)}>
                                                <option value="">— Сонгоно уу —</option>
                                                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="Жолооны ангилал">
                                            <Select value={form.driver_license} onChange={e => set('driver_license', e.target.value)}>
                                                <option value="">— Байхгүй —</option>
                                                {['A','B','C','D','E'].map(c => <option key={c} value={c}>{c} ангилал</option>)}
                                            </Select>
                                        </Field>
                                    </div>
                                    <label className="flex cursor-pointer items-center gap-3">
                                        <input type="checkbox" checked={form.military_service} onChange={e => set('military_service', e.target.checked)} className="size-4 rounded accent-red-600" />
                                        <span className="text-sm font-medium text-foreground">Цэргийн алба хааж дууссан</span>
                                    </label>

                                    <SectionTitle>Боловсрол</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <Field label="Зэрэг">
                                            <Select value={form.education_degree} onChange={e => set('education_degree', e.target.value)}>
                                                <option value="">— Сонгоно уу —</option>
                                                {['Бүрэн дунд','Техникийн','Бакалавр','Магистр','Доктор'].map(d => <option key={d} value={d}>{d}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="Сургуулийн нэр"><Input value={form.education_school} onChange={e => set('education_school', e.target.value)} /></Field>
                                        <Field label="Мэргэжил"><Input value={form.education_major} onChange={e => set('education_major', e.target.value)} /></Field>
                                    </div>
                                </div>
                            )}

                            {/* ── 2. ХОЛБОО БАРИХ ── */}
                            {tab === 'contact' && (
                                <div className="space-y-6">
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                                        Нэвтрэх нэр болон нууц үгийг <strong>Системийн тохиргоо</strong>-д өөрчилнө.
                                    </div>
                                    <SectionTitle>Холбоо барих</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Утасны дугаар" required><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></Field>
                                        <Field label="Имэйл"><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Field>
                                        <Field label="Оршин суугаа хаяг"><Input value={form.address} onChange={e => set('address', e.target.value)} /></Field>
                                    </div>
                                    <SectionTitle>Яаралтай холбоо барих</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <Field label="Нэр"><Input value={form.emergency_name} onChange={e => set('emergency_name', e.target.value)} /></Field>
                                        <Field label="Утас"><Input value={form.emergency_phone} onChange={e => set('emergency_phone', e.target.value)} /></Field>
                                        <Field label="Хамаарал">
                                            <Select value={form.emergency_relation} onChange={e => set('emergency_relation', e.target.value)}>
                                                <option value="">— Сонгоно уу —</option>
                                                {['Эхнэр','Нөхөр','Эцэг','Эх','Ах','Эгч','Дүү','Найз'].map(r => <option key={r} value={r}>{r}</option>)}
                                            </Select>
                                        </Field>
                                    </div>
                                </div>
                            )}

                            {/* ── 3. АЖЛЫН МЭДЭЭЛЭЛ ── */}
                            {tab === 'work' && (
                                <div className="space-y-6">
                                    <SectionTitle>Ажлын мэдээлэл</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Салбар" required>
                                            <Select value={form.branch_id} onChange={e => set('branch_id', e.target.value)}>
                                                <option value="">— Салбар сонгоно уу —</option>
                                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="Албан тушаал" required>
                                            <Select value={form.position_id} onChange={e => set('position_id', e.target.value)}>
                                                <option value="">— Тушаал сонгоно уу —</option>
                                                {positions.map(p => <option key={p.id} value={p.id}>{p.name}{p.department ? ` (${p.department})` : ''}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="Цалин (₮)" required><Input type="number" value={form.salary} onChange={e => set('salary', e.target.value)} /></Field>
                                        <Field label="Ажилд орсон огноо" required><Input type="date" value={form.hired_date} onChange={e => set('hired_date', e.target.value)} /></Field>
                                        <Field label="Туршилтын хугацаа дуусах"><Input type="date" value={form.probation_end_date} onChange={e => set('probation_end_date', e.target.value)} /></Field>
                                        <Field label="Статус">
                                            <Select value={form.status} onChange={e => set('status', e.target.value)}>
                                                <option value="active">Идэвхтэй</option>
                                                <option value="inactive">Идэвхгүй</option>
                                            </Select>
                                        </Field>
                                    </div>

                                    {/* Нэмэлт портал нэвтрэх эрх */}
                                    <SectionTitle>Нэмэлт портал нэвтрэх эрх</SectionTitle>
                                    <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/15 p-4">
                                        <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                                            Үндсэн албан тушаалаасаа гадна <strong>тэмдэглэсэн портал руу нэвтэрч ажиллах</strong> эрх олгоно. Жишээ нь сувилагч хааяа ресепшний ажил гүйцэтгэдэг бол "Ресепшн" -ийг тэмдэглэнэ.
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {[
                                                { value: 'reception', label: 'Ресепшн портал' },
                                                { value: 'lab',       label: 'Лаб портал' },
                                                { value: 'hr',        label: 'HR портал' },
                                            ].map(opt => {
                                                const checked = form.extra_portals.includes(opt.value);
                                                return (
                                                    <label key={opt.value}
                                                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                                                            checked
                                                                ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-700'
                                                                : 'border-gray-200 dark:border-gray-700 hover:bg-muted/30'
                                                        }`}>
                                                        <input type="checkbox" checked={checked}
                                                            onChange={e => {
                                                                if (e.target.checked) set('extra_portals', [...form.extra_portals, opt.value]);
                                                                else set('extra_portals', form.extra_portals.filter(p => p !== opt.value));
                                                            }}
                                                            className="size-4 rounded text-violet-600 focus:ring-violet-500" />
                                                        <span className="text-sm font-medium">{opt.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <SectionTitle>Ээлжийн амралт</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Нэмэгдэл хоног">
                                            <Input
                                                type="number" min="0" max="365"
                                                value={form.vacation_extra_days}
                                                onChange={e => set('vacation_extra_days', Number(e.target.value))}
                                            />
                                        </Field>
                                    </div>
                                    {Number(form.vacation_extra_days) > 0 && (
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                                            <strong>Ээлжийн амралт:</strong>{' '}
                                            15 үндсэн өдөр + {Number(form.vacation_extra_days)} нэмэгдэл
                                            {' '}= <strong>{15 + Number(form.vacation_extra_days)} хоног нийт</strong>
                                        </div>
                                    )}

                                    <Field label="Тэмдэглэл"><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
                                </div>
                            )}

                            {/* ── 4. ГЭРЭЭ & ЛИЦЕНЗ ── */}
                            {tab === 'docs' && (
                                <div className="space-y-8">
                                    <div>
                                        <SectionTitle>Хөдөлмөрийн гэрээ</SectionTitle>
                                        {employee.contracts.length === 0
                                            ? <p className="text-sm italic text-muted-foreground">Гэрээ бүртгэгдээгүй байна.</p>
                                            : <div className="space-y-3">
                                                {employee.contracts.map(c => (
                                                    <div key={c.id} className="rounded-xl border bg-muted/30 p-4 text-sm">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-foreground">
                                                                {c.contract_type === 'fixed' ? 'Тодорхой хугацаатай' : 'Тодорхойгүй хугацаатай'}
                                                            </span>
                                                            {c.days_until_expiry !== null && (
                                                                <span className={`text-xs ${expiryColor(c.days_until_expiry)}`}>
                                                                    {c.days_until_expiry} хоног үлдсэн
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-1 text-muted-foreground">{c.start_date} → {c.end_date ?? 'Тодорхойгүй'}</div>
                                                        {c.notes && <div className="mt-1 text-muted-foreground">{c.notes}</div>}
                                                    </div>
                                                ))}
                                              </div>
                                        }
                                    </div>
                                    <div>
                                        <SectionTitle>Лиценз / Гэрчилгээ</SectionTitle>
                                        {employee.licenses.length > 0 && (
                                            <div className="mb-4 space-y-3">
                                                {employee.licenses.map(l => (
                                                    <div key={l.id} className="rounded-xl border bg-muted/30 p-4 text-sm">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-foreground">{l.name}</span>
                                                            {l.days_until_expiry !== null && (
                                                                <span className={`text-xs ${expiryColor(l.days_until_expiry)}`}>
                                                                    {l.days_until_expiry} хоног үлдсэн
                                                                </span>
                                                            )}
                                                        </div>
                                                        {l.issuer && <div className="text-muted-foreground">{l.issuer}</div>}
                                                        <div className="text-muted-foreground">{l.start_date} → {l.end_date ?? 'Тодорхойгүй'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {newLicenses.length > 0 && (
                                            <div className="mb-4 space-y-4">
                                                {newLicenses.map((lic, i) => (
                                                    <div key={i} className="rounded-xl border border-red-100 bg-red-50/20 p-4">
                                                        <div className="mb-3 flex items-center justify-between">
                                                            <span className="text-sm font-semibold text-foreground">Шинэ гэрчилгээ #{i + 1}</span>
                                                            <button type="button" onClick={() => removeLicense(i)}
                                                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors">
                                                                <Trash2 className="size-3" /> Устгах
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                            <Field label="Гэрчилгээний нэр" required><Input value={lic.name} onChange={e => updateLicense(i, 'name', e.target.value)} /></Field>
                                                            <Field label="Олгосон байгууллага"><Input value={lic.issuer} onChange={e => updateLicense(i, 'issuer', e.target.value)} /></Field>
                                                            <Field label="Эхлэх огноо"><Input type="date" value={lic.start_date} onChange={e => updateLicense(i, 'start_date', e.target.value)} /></Field>
                                                            <Field label="Дуусах огноо"><Input type="date" value={lic.end_date} onChange={e => updateLicense(i, 'end_date', e.target.value)} /></Field>
                                                            <div className="sm:col-span-2"><Field label="Тэмдэглэл"><Textarea value={lic.notes} onChange={e => updateLicense(i, 'notes', e.target.value)} rows={2} /></Field></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <button type="button" onClick={addLicense}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-semibold text-muted-foreground hover:border-red-300 hover:text-red-500 transition-colors">
                                            <Plus className="size-4" /> Шинэ гэрчилгээ нэмэх
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── 5. САНХҮҮ ── */}
                            {tab === 'finance' && (
                                <div className="space-y-6">
                                    <SectionTitle>Банкны мэдээлэл</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Банкны нэр">
                                            <Select value={form.bank_name} onChange={e => set('bank_name', e.target.value)}>
                                                <option value="">— Сонгоно уу —</option>
                                                {['Худалдаа Хөгжлийн Банк','Хаан Банк','Голомт Банк','Хас Банк','Төрийн Банк','Капитал Банк'].map(b => <option key={b} value={b}>{b}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="Дансны дугаар"><Input value={form.bank_account} onChange={e => set('bank_account', e.target.value)} /></Field>
                                        <Field label="Дансны эзэмшигчийн нэр"><Input value={form.bank_account_name} onChange={e => set('bank_account_name', e.target.value)} /></Field>
                                    </div>
                                </div>
                            )}

                            {/* ── 6. ГЭР БҮЛ ── */}
                            {tab === 'family' && (
                                <div className="space-y-6">
                                    <SectionTitle>Гэр бүлийн байдал</SectionTitle>
                                    <div className="flex flex-wrap gap-6">
                                        <label className="flex cursor-pointer items-center gap-3">
                                            <input type="checkbox" checked={form.is_married} onChange={e => set('is_married', e.target.checked)} className="size-4 rounded accent-red-600" />
                                            <span className="text-sm font-medium text-foreground">Гэрлэсэн</span>
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-3">
                                            <input type="checkbox" checked={form.has_children} onChange={e => set('has_children', e.target.checked)} className="size-4 rounded accent-red-600" />
                                            <span className="text-sm font-medium text-foreground">Хүүхэдтэй</span>
                                        </label>
                                        {form.has_children && (
                                            <Field label="Хүүхдийн тоо">
                                                <Input type="number" min={1} max={20} value={form.children_count} onChange={e => set('children_count', parseInt(e.target.value) || 0)} className="w-24" />
                                            </Field>
                                        )}
                                    </div>

                                    {employee.family_members.length > 0 && (
                                        <>
                                            <SectionTitle>Бүртгэлтэй гэр бүлийн гишүүд</SectionTitle>
                                            <div className="space-y-3">
                                                {employee.family_members.map(f => (
                                                    <div key={f.id} className="rounded-xl border bg-muted/30 p-4 text-sm">
                                                        <div className="font-semibold text-foreground">{f.relationship} — {f.last_name} {f.first_name}</div>
                                                        <div className="mt-1 flex flex-wrap gap-3 text-muted-foreground">
                                                            {f.phone && <span>{f.phone}</span>}
                                                            {f.birth_date && <span>{f.birth_date}</span>}
                                                            {f.employment_status && <span>{f.employment_status}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    <SectionTitle>Шинэ гэр бүлийн гишүүн нэмэх</SectionTitle>
                                    <div className="space-y-4">
                                        {newFamily.map((fm, i) => (
                                            <div key={i} className="rounded-xl border border-red-100 bg-red-50/20 p-4">
                                                <div className="mb-3 flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-foreground">{fm.relationship || `Гэр бүл #${i + 1}`}</span>
                                                    <button type="button" onClick={() => removeFamily(i)}
                                                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors">
                                                        <Trash2 className="size-3" /> Устгах
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <Field label="Хамаарал">
                                                        <Select value={fm.relationship} onChange={e => updateFamily(i, 'relationship', e.target.value)}>
                                                            <option value="">— Сонгоно уу —</option>
                                                            {['Эхнэр','Нөхөр','Хүүхэд','Эцэг','Эх','Ах','Эгч','Дүү'].map(r => <option key={r} value={r}>{r}</option>)}
                                                        </Select>
                                                    </Field>
                                                    <Field label="Овог"><Input value={fm.last_name} onChange={e => updateFamily(i, 'last_name', e.target.value)} /></Field>
                                                    <Field label="Нэр"><Input value={fm.first_name} onChange={e => updateFamily(i, 'first_name', e.target.value)} /></Field>
                                                    <Field label="Утас"><Input value={fm.phone} onChange={e => updateFamily(i, 'phone', e.target.value)} /></Field>
                                                    <Field label="Төрсөн огноо"><Input type="date" value={fm.birth_date} onChange={e => updateFamily(i, 'birth_date', e.target.value)} /></Field>
                                                    <Field label="Ажил эрхлэлт">
                                                        <Select value={fm.employment_status} onChange={e => updateFamily(i, 'employment_status', e.target.value)}>
                                                            <option value="">— Сонгоно уу —</option>
                                                            {['Ажилтай','Ажилгүй','Оюутан','Тэтгэвэрт','Хүүхэд'].map(s => <option key={s} value={s}>{s}</option>)}
                                                        </Select>
                                                    </Field>
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={addFamily}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-semibold text-muted-foreground hover:border-red-300 hover:text-red-500 transition-colors">
                                            <Plus className="size-4" /> Гэр бүлийн гишүүн нэмэх
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-4">
                            <button type="button"
                                onClick={() => setTab(TABS[Math.max(0, tabIdx - 1)].key)}
                                disabled={tabIdx === 0}
                                className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors">
                                <ChevronLeft className="size-4" /> Өмнөх
                            </button>
                            <span className="text-xs text-muted-foreground">{tabIdx + 1} / {TABS.length}</span>
                            {tabIdx < TABS.length - 1 ? (
                                <button type="button"
                                    onClick={() => setTab(TABS[tabIdx + 1].key)}
                                    className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 transition-opacity">
                                    Дараах <ChevronRight className="size-4" />
                                </button>
                            ) : (
                                <button type="submit" disabled={processing}
                                    className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
                                    <Save className="size-4" />
                                    {processing ? 'Хадгалж байна...' : 'Өөрчлөлт хадгалах'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
