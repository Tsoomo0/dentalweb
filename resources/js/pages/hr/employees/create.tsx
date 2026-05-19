import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle, Briefcase, ChevronLeft, ChevronRight, CreditCard,
    FileText, Heart, Plus, Save, Trash2, User, Users,
} from 'lucide-react';
import { useState } from 'react';

interface Branch   { id: number; name: string }
interface Position { id: number; name: string; portal: string; department: string | null }

interface License {
    name: string; issuer: string; start_date: string; end_date: string; notes: string;
}
interface FamilyMember {
    last_name: string; first_name: string; phone: string;
    relationship: string; birth_date: string; employment_status: string;
}

interface Props { branches: Branch[]; positions: Position[] }

const TABS = [
    { key: 'personal', label: 'Хувийн мэдээлэл',  icon: User },
    { key: 'contact',  label: 'Холбоо / Нэвтрэх', icon: Users },
    { key: 'work',     label: 'Ажлын мэдээлэл',    icon: Briefcase },
    { key: 'docs',     label: 'Гэрээ & Лиценз',    icon: FileText },
    { key: 'finance',  label: 'Санхүү',             icon: CreditCard },
    { key: 'family',   label: 'Гэр бүл',            icon: Heart },
] as const;

type TabKey = typeof TABS[number]['key'];

// ── Shared UI components ──────────────────────────────────────────────────────

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
                {label}{required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

const FIELD_LABELS: Record<string, string> = {
    last_name: 'Овог', first_name: 'Нэр', register_number: 'Регистрийн дугаар',
    birth_date: 'Төрсөн огноо', gender: 'Хүйс',
    username: 'Нэвтрэх нэр', password: 'Нууц үг',
    phone: 'Утасны дугаар', email: 'Имэйл',
    branch_id: 'Салбар', position_id: 'Албан тушаал',
    salary: 'Цалин', hired_date: 'Ажилд орсон огноо',
};

function translateError(key: string, msg: string): string {
    const name = FIELD_LABELS[key] ?? key;
    if (msg.includes('already been taken') || msg.includes('unique')) return `${name} аль хэдийн бүртгэгдсэн байна`;
    if (msg.includes('required')) return `${name} заавал бөглөнө үү`;
    if (msg.includes('at least 6') || msg.includes('min:6')) return 'Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой';
    if (msg.includes('must be a date') || msg.includes('valid date')) return 'Зөв огноо оруулна уу';
    return msg;
}

const TAB_FIELDS: Record<string, string[]> = {
    personal: ['last_name', 'first_name', 'register_number', 'birth_date', 'gender'],
    contact:  ['username', 'password', 'phone', 'email'],
    work:     ['branch_id', 'position_id', 'salary', 'hired_date'],
    docs:     ['contract_start_date', 'contract_end_date'],
    finance:  ['bank_name', 'bank_account'],
    family:   [],
};

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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CreateEmployee({ branches, positions }: Props) {
    const [tab, setTab]     = useState<TabKey>('personal');
    const [licenses, setLicenses] = useState<License[]>([{ name: '', issuer: '', start_date: '', end_date: '', notes: '' }]);
    const [family, setFamily]     = useState<FamilyMember[]>([{ last_name: '', first_name: '', phone: '', relationship: '', birth_date: '', employment_status: '' }]);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const { data, setData, processing } = useForm<any>({
        photo: null as File | null,
        last_name: '', first_name: '', register_number: '',
        birth_date: '', gender: '',
        family_name: '', ethnicity: '', birth_place: '',
        blood_type: '', driver_license: '', military_service: false,
        education_degree: '', education_school: '', education_major: '',
        username: '', password: '', phone: '', email: '', address: '',
        emergency_name: '', emergency_phone: '', emergency_relation: '',
        branch_id: '', position_id: '', salary: '', hired_date: '',
        probation_end_date: '', status: 'active',
        vacation_extra_days: 0,
        contract_type: 'fixed', contract_start_date: '', contract_end_date: '', contract_notes: '',
        bank_name: '', bank_account: '', bank_account_name: '',
        is_married: false, has_children: false, children_count: 0,
        notes: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'HR', href: '/hr/employees' },
        { title: 'Ажилтнууд', href: '/hr/employees' },
        { title: 'Шинэ ажилтан', href: '/hr/employees/create' },
    ];

    const tabIdx = TABS.findIndex(t => t.key === tab);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormErrors({});
        const fd = new FormData();
        Object.entries(data).forEach(([k, v]) => {
            if (v !== null && v !== undefined) {
                if (v instanceof File) fd.append(k, v);
                else fd.append(k, String(v));
            }
        });
        licenses.forEach((l, i) => Object.entries(l).forEach(([k, v]) => fd.append(`licenses[${i}][${k}]`, v)));
        family.forEach((f, i) => Object.entries(f).forEach(([k, v]) => fd.append(`family_members[${i}][${k}]`, v)));
        router.post('/hr/employees', fd as any, {
            onError: (errors) => {
                setFormErrors(errors);
                // Алдаатай таб руу автоматаар шилжих
                for (const [tabKey, fields] of Object.entries(TAB_FIELDS)) {
                    if (fields.some(f => errors[f])) {
                        setTab(tabKey as TabKey);
                        break;
                    }
                }
            },
        });
    }

    function addLicense() { setLicenses(p => [...p, { name: '', issuer: '', start_date: '', end_date: '', notes: '' }]); }
    function removeLicense(i: number) { setLicenses(p => p.filter((_, idx) => idx !== i)); }
    function updateLicense(i: number, k: keyof License, v: string) { setLicenses(p => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l)); }

    function addFamily() { setFamily(p => [...p, { last_name: '', first_name: '', phone: '', relationship: '', birth_date: '', employment_status: '' }]); }
    function removeFamily(i: number) { setFamily(p => p.filter((_, idx) => idx !== i)); }
    function updateFamily(i: number, k: keyof FamilyMember, v: string) { setFamily(p => p.map((f, idx) => idx === i ? { ...f, [k]: v } : f)); }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Шинэ ажилтан бүртгэх" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.visit('/hr/employees')}
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                        <ChevronLeft className="size-4" /> Буцах
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Шинэ ажилтан бүртгэх</h1>
                        <p className="text-sm text-muted-foreground">Бүх хэсгийг бөглөөд хадгална уу</p>
                    </div>
                </div>

                {Object.keys(formErrors).length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                                    Бүртгэл амжилтгүй болов. Дараах алдаануудыг засна уу:
                                </p>
                                <ul className="space-y-0.5">
                                    {Object.entries(formErrors).map(([key, msg]) => (
                                        <li key={key} className="text-xs text-red-600 dark:text-red-400">
                                            • {translateError(key, msg)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

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

                        {/* Tab content */}
                        <div className="flex-1 overflow-y-auto p-6">

                            {/* ── 1. ХУВИЙН МЭДЭЭЛЭЛ ── */}
                            {tab === 'personal' && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-6">
                                        <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-muted/30 text-3xl">
                                            {data.photo
                                                ? <img src={URL.createObjectURL(data.photo)} className="size-24 rounded-full object-cover" alt="" />
                                                : <span className="text-muted-foreground">👤</span>
                                            }
                                        </div>
                                        <div>
                                            <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                                                Зураг сонгох
                                                <input type="file" accept="image/*" className="hidden"
                                                    onChange={e => setData('photo', e.target.files?.[0] ?? null)} />
                                            </label>
                                            <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG · Дээд тал 2MB</p>
                                        </div>
                                    </div>

                                    <SectionTitle>Үндсэн мэдээлэл</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Овог" required>
                                            <Input value={data.last_name} onChange={e => setData('last_name', e.target.value)} placeholder="Батболд" />
                                        </Field>
                                        <Field label="Нэр" required>
                                            <Input value={data.first_name} onChange={e => setData('first_name', e.target.value)} placeholder="Мөнхбаяр" />
                                        </Field>
                                        <Field label="Регистрийн дугаар" required error={formErrors.register_number ? translateError('register_number', formErrors.register_number) : undefined}>
                                            <Input value={data.register_number} onChange={e => setData('register_number', e.target.value)} placeholder="УВ88010112"
                                                className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-muted ${formErrors.register_number ? 'border-red-400' : ''}`} />
                                        </Field>
                                        <Field label="Төрсөн огноо" required>
                                            <Input type="date" value={data.birth_date} onChange={e => setData('birth_date', e.target.value)} />
                                        </Field>
                                        <Field label="Хүйс" required>
                                            <Select value={data.gender} onChange={e => setData('gender', e.target.value)}>
                                                <option value="">— Сонгоно уу —</option>
                                                <option value="male">Эрэгтэй</option>
                                                <option value="female">Эмэгтэй</option>
                                            </Select>
                                        </Field>
                                        <Field label="Ургийн овог">
                                            <Input value={data.family_name} onChange={e => setData('family_name', e.target.value)} placeholder="Боржигин" />
                                        </Field>
                                    </div>

                                    <SectionTitle>Нэмэлт мэдээлэл</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Яс үндэс">
                                            <Input value={data.ethnicity} onChange={e => setData('ethnicity', e.target.value)} placeholder="Халх" />
                                        </Field>
                                        <Field label="Төрсөн газар">
                                            <Input value={data.birth_place} onChange={e => setData('birth_place', e.target.value)} placeholder="Улаанбаатар" />
                                        </Field>
                                        <Field label="Цусны бүлэг">
                                            <Select value={data.blood_type} onChange={e => setData('blood_type', e.target.value)}>
                                                <option value="">— Сонгоно уу —</option>
                                                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="Жолооны ангилал">
                                            <Select value={data.driver_license} onChange={e => setData('driver_license', e.target.value)}>
                                                <option value="">— Байхгүй —</option>
                                                {['A','B','C','D','E'].map(c => <option key={c} value={c}>{c} ангилал</option>)}
                                            </Select>
                                        </Field>
                                    </div>

                                    <label className="flex cursor-pointer items-center gap-3">
                                        <input type="checkbox" checked={data.military_service}
                                            onChange={e => setData('military_service', e.target.checked)}
                                            className="size-4 rounded accent-red-600" />
                                        <span className="text-sm font-medium text-foreground">Цэргийн алба хааж дууссан</span>
                                    </label>

                                    <SectionTitle>Боловсрол</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <Field label="Зэрэг">
                                            <Select value={data.education_degree} onChange={e => setData('education_degree', e.target.value)}>
                                                <option value="">— Сонгоно уу —</option>
                                                {['Бүрэн дунд','Техникийн','Бакалавр','Магистр','Доктор'].map(d => <option key={d} value={d}>{d}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="Сургуулийн нэр">
                                            <Input value={data.education_school} onChange={e => setData('education_school', e.target.value)} placeholder="МУБИС" />
                                        </Field>
                                        <Field label="Мэргэжил">
                                            <Input value={data.education_major} onChange={e => setData('education_major', e.target.value)} placeholder="Шүдний эмч" />
                                        </Field>
                                    </div>
                                </div>
                            )}

                            {/* ── 2. ХОЛБОО / НЭВТРЭХ ── */}
                            {tab === 'contact' && (
                                <div className="space-y-6">
                                    <SectionTitle>Нэвтрэх мэдээлэл</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Нэвтрэх нэр (username)" required error={formErrors.username ? translateError('username', formErrors.username) : undefined}>
                                            <Input value={data.username} onChange={e => setData('username', e.target.value)} placeholder="bold.erdene"
                                                className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-muted ${formErrors.username ? 'border-red-400' : ''}`} />
                                        </Field>
                                        <Field label="Нууц үг" required error={formErrors.password ? translateError('password', formErrors.password) : undefined}>
                                            <Input type="password" value={data.password} onChange={e => setData('password', e.target.value)} placeholder="••••••••"
                                                className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-muted ${formErrors.password ? 'border-red-400' : ''}`} />
                                        </Field>
                                    </div>

                                    <SectionTitle>Холбоо барих</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Утасны дугаар" required>
                                            <Input value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="99001122" />
                                        </Field>
                                        <Field label="Имэйл" error={formErrors.email ? translateError('email', formErrors.email) : undefined}>
                                            <Input type="email" value={data.email} onChange={e => setData('email', e.target.value)} placeholder="name@dental.mn"
                                                className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-muted ${formErrors.email ? 'border-red-400' : ''}`} />
                                        </Field>
                                        <Field label="Оршин суугаа хаяг">
                                            <Input value={data.address} onChange={e => setData('address', e.target.value)} placeholder="БЗД, 4-р хороо" />
                                        </Field>
                                    </div>

                                    <SectionTitle>Яаралтай холбоо барих</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <Field label="Нэр">
                                            <Input value={data.emergency_name} onChange={e => setData('emergency_name', e.target.value)} placeholder="Болормаа" />
                                        </Field>
                                        <Field label="Утас">
                                            <Input value={data.emergency_phone} onChange={e => setData('emergency_phone', e.target.value)} placeholder="99001122" />
                                        </Field>
                                        <Field label="Хамаарал">
                                            <Select value={data.emergency_relation} onChange={e => setData('emergency_relation', e.target.value)}>
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
                                            <Select value={data.branch_id} onChange={e => setData('branch_id', e.target.value)}>
                                                <option value="">— Салбар сонгоно уу —</option>
                                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="Албан тушаал" required>
                                            <Select value={data.position_id} onChange={e => setData('position_id', e.target.value)}>
                                                <option value="">— Тушаал сонгоно уу —</option>
                                                {positions.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name}{p.department ? ` (${p.department})` : ''}
                                                    </option>
                                                ))}
                                            </Select>
                                        </Field>
                                        <Field label="Цалин (₮)" required>
                                            <Input type="number" value={data.salary} onChange={e => setData('salary', e.target.value)} placeholder="1500000" />
                                        </Field>
                                        <Field label="Ажилд орсон огноо" required>
                                            <Input type="date" value={data.hired_date} onChange={e => setData('hired_date', e.target.value)} />
                                        </Field>
                                        <Field label="Туршилтын хугацаа дуусах">
                                            <Input type="date" value={data.probation_end_date} onChange={e => setData('probation_end_date', e.target.value)} />
                                        </Field>
                                        <Field label="Статус">
                                            <Select value={data.status} onChange={e => setData('status', e.target.value)}>
                                                <option value="active">Идэвхтэй</option>
                                                <option value="inactive">Идэвхгүй</option>
                                            </Select>
                                        </Field>
                                    </div>

                                    {data.position_id && (
                                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                                            <strong>Нэвтрэх портал:</strong>{' '}
                                            {(() => {
                                                const portal = positions.find(p => String(p.id) === String(data.position_id))?.portal;
                                                if (portal === 'doctor')    return 'Эмчийн портал';
                                                if (portal === 'reception') return 'Ресепшний портал';
                                                if (portal === 'hr')        return 'HR портал';
                                                if (portal === 'admin')     return 'Админ портал';
                                                return 'Ажилтны портал';
                                            })()}
                                        </div>
                                    )}

                                    <SectionTitle>Ээлжийн амралт</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Нэмэгдэл хоног">
                                            <Input
                                                type="number" min="0" max="365"
                                                value={data.vacation_extra_days}
                                                onChange={e => setData('vacation_extra_days', Number(e.target.value))}
                                                placeholder="0"
                                            />
                                        </Field>
                                    </div>
                                    {Number(data.vacation_extra_days) > 0 && (
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                                            <strong>Ээлжийн амралт:</strong>{' '}
                                            15 үндсэн өдөр + {Number(data.vacation_extra_days)} нэмэгдэл
                                            {' '}= <strong>{15 + Number(data.vacation_extra_days)} хоног нийт</strong>
                                        </div>
                                    )}

                                    <Field label="Тэмдэглэл">
                                        <Textarea value={data.notes} onChange={e => setData('notes', e.target.value)} placeholder="Нэмэлт тэмдэглэл..." />
                                    </Field>
                                </div>
                            )}

                            {/* ── 4. ГЭРЭЭ & ЛИЦЕНЗ ── */}
                            {tab === 'docs' && (
                                <div className="space-y-8">
                                    <div>
                                        <SectionTitle>Хөдөлмөрийн гэрээ</SectionTitle>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <Field label="Гэрээний төрөл">
                                                <Select value={data.contract_type} onChange={e => setData('contract_type', e.target.value)}>
                                                    <option value="fixed">Тодорхой хугацаатай</option>
                                                    <option value="indefinite">Тодорхойгүй хугацаатай</option>
                                                </Select>
                                            </Field>
                                            <Field label="Гэрээний файл">
                                                <input type="file" accept=".pdf,.doc,.docx"
                                                    className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-red-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-red-700"
                                                    onChange={e => setData('contract_file', e.target.files?.[0] ?? null)} />
                                            </Field>
                                            <Field label="Эхлэх огноо">
                                                <Input type="date" value={data.contract_start_date} onChange={e => setData('contract_start_date', e.target.value)} />
                                            </Field>
                                            <Field label="Дуусах огноо">
                                                <Input type="date" value={data.contract_end_date} onChange={e => setData('contract_end_date', e.target.value)} />
                                            </Field>
                                            <div className="sm:col-span-2">
                                                <Field label="Тэмдэглэл">
                                                    <Textarea value={data.contract_notes} onChange={e => setData('contract_notes', e.target.value)} />
                                                </Field>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <SectionTitle>Лиценз / Гэрчилгээ</SectionTitle>
                                        <div className="space-y-4">
                                            {licenses.map((lic, i) => (
                                                <div key={i} className="rounded-xl border bg-muted/30 p-4">
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <span className="text-sm font-semibold text-foreground">Гэрчилгээ #{i + 1}</span>
                                                        {licenses.length > 1 && (
                                                            <button type="button" onClick={() => removeLicense(i)}
                                                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors">
                                                                <Trash2 className="size-3" /> Устгах
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                        <Field label="Гэрчилгээний нэр" required>
                                                            <Input value={lic.name} onChange={e => updateLicense(i, 'name', e.target.value)} placeholder="Шүдний эмчийн лиценз" />
                                                        </Field>
                                                        <Field label="Олгосон байгууллага">
                                                            <Input value={lic.issuer} onChange={e => updateLicense(i, 'issuer', e.target.value)} placeholder="Эрүүл мэндийн яам" />
                                                        </Field>
                                                        <Field label="Эхлэх огноо">
                                                            <Input type="date" value={lic.start_date} onChange={e => updateLicense(i, 'start_date', e.target.value)} />
                                                        </Field>
                                                        <Field label="Дуусах огноо">
                                                            <Input type="date" value={lic.end_date} onChange={e => updateLicense(i, 'end_date', e.target.value)} />
                                                        </Field>
                                                        <div className="sm:col-span-2">
                                                            <Field label="Тэмдэглэл">
                                                                <Textarea value={lic.notes} onChange={e => updateLicense(i, 'notes', e.target.value)} rows={2} />
                                                            </Field>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={addLicense}
                                                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-semibold text-muted-foreground hover:border-red-300 hover:text-red-500 transition-colors">
                                                <Plus className="size-4" /> Гэрчилгээ нэмэх
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── 5. САНХҮҮ ── */}
                            {tab === 'finance' && (
                                <div className="space-y-6">
                                    <SectionTitle>Банкны мэдээлэл</SectionTitle>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Банкны нэр">
                                            <Select value={data.bank_name} onChange={e => setData('bank_name', e.target.value)}>
                                                <option value="">— Сонгоно уу —</option>
                                                {['Худалдаа Хөгжлийн Банк','Хаан Банк','Голомт Банк','Хас Банк','Төрийн Банк','Капитал Банк'].map(b => (
                                                    <option key={b} value={b}>{b}</option>
                                                ))}
                                            </Select>
                                        </Field>
                                        <Field label="Дансны дугаар">
                                            <Input value={data.bank_account} onChange={e => setData('bank_account', e.target.value)} placeholder="4900123456" />
                                        </Field>
                                        <Field label="Дансны эзэмшигчийн нэр">
                                            <Input value={data.bank_account_name} onChange={e => setData('bank_account_name', e.target.value)} placeholder="БАТБОЛД МӨНХБАЯР" />
                                        </Field>
                                    </div>
                                </div>
                            )}

                            {/* ── 6. ГЭР БҮЛ ── */}
                            {tab === 'family' && (
                                <div className="space-y-6">
                                    <SectionTitle>Гэр бүлийн байдал</SectionTitle>
                                    <div className="flex flex-wrap gap-6">
                                        <label className="flex cursor-pointer items-center gap-3">
                                            <input type="checkbox" checked={data.is_married}
                                                onChange={e => setData('is_married', e.target.checked)}
                                                className="size-4 rounded accent-red-600" />
                                            <span className="text-sm font-medium text-foreground">Гэрлэсэн</span>
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-3">
                                            <input type="checkbox" checked={data.has_children}
                                                onChange={e => setData('has_children', e.target.checked)}
                                                className="size-4 rounded accent-red-600" />
                                            <span className="text-sm font-medium text-foreground">Хүүхэдтэй</span>
                                        </label>
                                        {data.has_children && (
                                            <Field label="Хүүхдийн тоо">
                                                <Input type="number" min={1} max={20} value={data.children_count}
                                                    onChange={e => setData('children_count', parseInt(e.target.value) || 0)}
                                                    className="w-24" />
                                            </Field>
                                        )}
                                    </div>

                                    <SectionTitle>Гэр бүлийн гишүүд</SectionTitle>
                                    <div className="space-y-4">
                                        {family.map((fm, i) => (
                                            <div key={i} className="rounded-xl border bg-muted/30 p-4">
                                                <div className="mb-3 flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {fm.relationship || `Гэр бүл #${i + 1}`}
                                                    </span>
                                                    {family.length > 1 && (
                                                        <button type="button" onClick={() => removeFamily(i)}
                                                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors">
                                                            <Trash2 className="size-3" /> Устгах
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <Field label="Хамаарал">
                                                        <Select value={fm.relationship} onChange={e => updateFamily(i, 'relationship', e.target.value)}>
                                                            <option value="">— Сонгоно уу —</option>
                                                            {['Эхнэр','Нөхөр','Хүүхэд','Эцэг','Эх','Ах','Эгч','Дүү'].map(r => <option key={r} value={r}>{r}</option>)}
                                                        </Select>
                                                    </Field>
                                                    <Field label="Овог">
                                                        <Input value={fm.last_name} onChange={e => updateFamily(i, 'last_name', e.target.value)} placeholder="Батболд" />
                                                    </Field>
                                                    <Field label="Нэр">
                                                        <Input value={fm.first_name} onChange={e => updateFamily(i, 'first_name', e.target.value)} placeholder="Болормаа" />
                                                    </Field>
                                                    <Field label="Утас">
                                                        <Input value={fm.phone} onChange={e => updateFamily(i, 'phone', e.target.value)} placeholder="99001122" />
                                                    </Field>
                                                    <Field label="Төрсөн огноо">
                                                        <Input type="date" value={fm.birth_date} onChange={e => updateFamily(i, 'birth_date', e.target.value)} />
                                                    </Field>
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
                                    {processing ? 'Хадгалж байна...' : 'Ажилтан бүртгэх'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
