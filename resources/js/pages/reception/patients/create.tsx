import ReceptionLayout from '@/layouts/reception-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { ArrowLeft, FileText, Heart, MapPin, Phone, Save, User } from 'lucide-react';
import { type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар',  href: '/reception/dashboard' },
    { title: 'Өвчтний карт',     href: '/reception/patients' },
    { title: 'Шинэ өвчтөн',     href: '/reception/patients/create' },
];

const GENDER_OPTIONS = [
    { value: 'male',   label: 'Эрэгтэй' },
    { value: 'female', label: 'Эмэгтэй' },
    { value: 'other',  label: 'Бусад' },
];

const CAT_LABEL: Record<string, string> = {
    treat:   'Ерөнхий эмчилгээ',
    endo:    'Сувгийн эмчилгээ',
    ortho:   'Зэр засал',
    perio:   'Буйлны эмчилгээ',
    prostho: 'Протез',
    surg:    'Мэс засал',
    prevent: 'Урьдчилан сэргийлэх',
};

interface Template {
    id: number;
    category: string;
    title: string;
}

interface Props {
    templates: Template[];
}


function Field({ label, required, error, children }: {
    label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

export default function PatientCreate({ templates }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        last_name:                  '',
        first_name:                 '',
        gender:                     '',
        date_of_birth:              '',
        register_number:            '',
        phone:                      '',
        phone2:                     '',
        email:                      '',
        address:                    '',
        emergency_contact_name:     '',
        emergency_contact_phone:    '',
        emergency_contact_relation: '',
        notes:                      '',
        consent_template_ids:       [] as number[],
    });

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/reception/patients');
    }

    function toggleTemplate(id: number) {
        setData('consent_template_ids',
            data.consent_template_ids.includes(id)
                ? data.consent_template_ids.filter(x => x !== id)
                : [...data.consent_template_ids, id]
        );
    }

    function toggleCategory(ids: number[]) {
        const allChecked = ids.every(id => data.consent_template_ids.includes(id));
        if (allChecked) {
            setData('consent_template_ids', data.consent_template_ids.filter(id => !ids.includes(id)));
        } else {
            const merged = [...new Set([...data.consent_template_ids, ...ids])];
            setData('consent_template_ids', merged);
        }
    }

    const inputClass = (field: keyof typeof errors) =>
        `w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow ${errors[field] ? 'border-red-400 focus:ring-red-400' : 'border-input'}`;

    // Group templates by category
    const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
        (acc[t.category] ??= []).push(t);
        return acc;
    }, {});

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Шинэ өвчтөн бүртгэх" />
            <div className="flex flex-1 flex-col gap-6 p-6 max-w-2xl">

                {/* ── Header ── */}
                <div className="flex items-center gap-3">
                    <Link href="/reception/patients"
                        className="flex size-9 items-center justify-center rounded-xl border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm">
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div>
                        <p className="text-sm text-muted-foreground">Өвчтний карт</p>
                        <h1 className="text-xl font-bold tracking-tight">Шинэ өвчтөн бүртгэх</h1>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-5">

                    {/* ── Хувийн мэдээлэл ── */}
                    <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
                        <div className="flex items-center gap-2 pb-1 border-b border-border">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white">
                                <User className="size-4" />
                            </div>
                            <h2 className="font-semibold text-foreground">Хувийн мэдээлэл</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Овог" required error={errors.last_name}>
                                <input
                                    type="text"
                                    value={data.last_name}
                                    onChange={e => setData('last_name', e.target.value)}
                                    placeholder="Овог"
                                    className={inputClass('last_name')}
                                />
                            </Field>
                            <Field label="Нэр" required error={errors.first_name}>
                                <input
                                    type="text"
                                    value={data.first_name}
                                    onChange={e => setData('first_name', e.target.value)}
                                    placeholder="Нэр"
                                    className={inputClass('first_name')}
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Хүйс" error={errors.gender}>
                                <select
                                    value={data.gender}
                                    onChange={e => setData('gender', e.target.value)}
                                    className={inputClass('gender')}
                                >
                                    <option value="">— Сонгоно уу —</option>
                                    {GENDER_OPTIONS.map(g => (
                                        <option key={g.value} value={g.value}>{g.label}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Төрсөн огноо" error={errors.date_of_birth}>
                                <input
                                    type="date"
                                    value={data.date_of_birth}
                                    onChange={e => setData('date_of_birth', e.target.value)}
                                    className={inputClass('date_of_birth')}
                                />
                            </Field>
                        </div>

                        <Field label="Регистрийн дугаар" error={errors.register_number}>
                            <input
                                type="text"
                                value={data.register_number}
                                onChange={e => setData('register_number', e.target.value)}
                                placeholder="АА12345678"
                                className={inputClass('register_number')}
                            />
                        </Field>
                    </section>

                    {/* ── Холбоо барих ── */}
                    <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
                        <div className="flex items-center gap-2 pb-1 border-b border-border">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                <Phone className="size-4" />
                            </div>
                            <h2 className="font-semibold text-foreground">Холбоо барих</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Утасны дугаар" required error={errors.phone}>
                                <input
                                    type="tel"
                                    value={data.phone}
                                    onChange={e => setData('phone', e.target.value)}
                                    placeholder="99112233"
                                    className={inputClass('phone')}
                                />
                            </Field>
                            <Field label="Нэмэлт утас" error={errors.phone2}>
                                <input
                                    type="tel"
                                    value={data.phone2}
                                    onChange={e => setData('phone2', e.target.value)}
                                    placeholder="Нэмэлт дугаар"
                                    className={inputClass('phone2')}
                                />
                            </Field>
                        </div>

                        <Field label="Имэйл хаяг" error={errors.email}>
                            <input
                                type="email"
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                                placeholder="example@mail.com"
                                className={inputClass('email')}
                            />
                        </Field>

                        <Field label="Оршин суух хаяг" error={errors.address}>
                            <textarea
                                value={data.address}
                                onChange={e => setData('address', e.target.value)}
                                placeholder="Дүүрэг, хороо, байр, тоот…"
                                rows={2}
                                className={`${inputClass('address')} resize-none`}
                            />
                        </Field>
                    </section>

                    {/* ── Яаралтай холбоо ── */}
                    <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
                        <div className="flex items-center gap-2 pb-1 border-b border-border">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                                <MapPin className="size-4" />
                            </div>
                            <h2 className="font-semibold text-foreground">Яаралтай холбоо барих</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Нэр" error={errors.emergency_contact_name}>
                                <input
                                    type="text"
                                    value={data.emergency_contact_name}
                                    onChange={e => setData('emergency_contact_name', e.target.value)}
                                    placeholder="Холбоо барих хүний нэр"
                                    className={inputClass('emergency_contact_name')}
                                />
                            </Field>
                            <Field label="Утас" error={errors.emergency_contact_phone}>
                                <input
                                    type="tel"
                                    value={data.emergency_contact_phone}
                                    onChange={e => setData('emergency_contact_phone', e.target.value)}
                                    placeholder="Утасны дугаар"
                                    className={inputClass('emergency_contact_phone')}
                                />
                            </Field>
                        </div>

                        <Field label="Хамаарал" error={errors.emergency_contact_relation}>
                            <input
                                type="text"
                                value={data.emergency_contact_relation}
                                onChange={e => setData('emergency_contact_relation', e.target.value)}
                                placeholder="Эцэг/эх, эхнэр/нөхөр, ах/эгч…"
                                className={inputClass('emergency_contact_relation')}
                            />
                        </Field>
                    </section>

                    {/* ── Зөвшөөрлийн маягт ── */}
                    {templates.length > 0 && (
                        <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 pb-1 border-b border-border">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                                    <FileText className="size-4" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="font-semibold text-foreground">Зөвшөөрлийн маягт</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Өвчтөний картанд нэмэгдэх маягтуудыг сонгоно уу</p>
                                </div>
                                {data.consent_template_ids.length > 0 && (
                                    <span className="rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
                                        {data.consent_template_ids.length} сонгосон
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3">
                                {Object.entries(grouped).map(([cat, items]) => {
                                    const ids = items.map(t => t.id);
                                    const checkedCount = ids.filter(id => data.consent_template_ids.includes(id)).length;
                                    const allChecked = checkedCount === ids.length;

                                    return (
                                        <div key={cat} className="rounded-xl border border-border overflow-hidden">
                                            {/* Category header with select-all */}
                                            <button
                                                type="button"
                                                onClick={() => toggleCategory(ids)}
                                                className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                                            >
                                                <div className={`flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${allChecked ? 'bg-emerald-600 border-emerald-600' : checkedCount > 0 ? 'bg-emerald-200 border-emerald-400' : 'border-border bg-background'}`}>
                                                    {allChecked && (
                                                        <svg className="size-2.5 text-white" fill="none" viewBox="0 0 10 8">
                                                            <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    )}
                                                    {!allChecked && checkedCount > 0 && (
                                                        <div className="size-1.5 rounded-sm bg-emerald-600" />
                                                    )}
                                                </div>
                                                <span className="text-sm font-semibold text-foreground">{CAT_LABEL[cat] ?? cat}</span>
                                                <span className="text-xs text-muted-foreground ml-auto">{checkedCount}/{ids.length}</span>
                                            </button>

                                            {/* Templates */}
                                            <div className="divide-y divide-border">
                                                {items.map(t => {
                                                    const checked = data.consent_template_ids.includes(t.id);
                                                    return (
                                                        <label
                                                            key={t.id}
                                                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${checked ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'hover:bg-muted/20'}`}
                                                        >
                                                            <div
                                                                onClick={() => toggleTemplate(t.id)}
                                                                className={`flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${checked ? 'bg-emerald-600 border-emerald-600' : 'border-border bg-background'}`}
                                                            >
                                                                {checked && (
                                                                    <svg className="size-2.5 text-white" fill="none" viewBox="0 0 10 8">
                                                                        <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <span className={`text-sm ${checked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                                {t.title}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* ── Тэмдэглэл ── */}
                    <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-1 border-b border-border">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                                <Heart className="size-4" />
                            </div>
                            <h2 className="font-semibold text-foreground">Нэмэлт тэмдэглэл</h2>
                        </div>
                        <textarea
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                            placeholder="Нэмэлт мэдээлэл, тусгай анхааруулга…"
                            rows={3}
                            className={`${inputClass('notes')} resize-none`}
                        />
                    </section>

                    {/* ── Actions ── */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            {processing
                                ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                : <Save className="size-4" />}
                            Бүртгэх
                        </button>
                        <Link href="/reception/patients"
                            className="rounded-xl border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                            Цуцлах
                        </Link>
                    </div>
                </form>
            </div>
        </ReceptionLayout>
    );
}
