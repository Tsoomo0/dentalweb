import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { ArrowLeft, Bell, Check, CheckCircle2, ClipboardList, Eye, FileText, GripVertical, Inbox, ListChecks, Pencil, Plus, Save, Settings2, Smartphone, Trash2 } from 'lucide-react';
import { useState } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type FieldType = 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select';
interface Field { key: string; label: string; type: FieldType; required: boolean; options?: string[]; }
interface FormT { id: number; name: string; description: string | null; fields: Field[]; success_message: string | null; notify_emails: string[]; is_active: boolean; submissions_count: number; }
interface Admin { id: number; name: string; email: string; }
interface Props { forms: FormT[]; admins: Admin[]; }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Вэбформ', href: '/admin/social/forms' },
];
const TYPE_LABEL: Record<FieldType, string> = { text: 'Текст', email: 'И-мэйл', phone: 'Утас', number: 'Тоо', textarea: 'Урт текст', select: 'Сонголт' };
const inputCls = 'w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20';
const newKey = () => 'q' + Math.random().toString(36).slice(2, 7);
const reveal = 'animate-in fade-in-0 slide-in-from-bottom-3 duration-500 fill-mode-both';

/* ─── Field editor ───────────────────────────────────────────────────────── */
function FieldRow({ field, onChange, onDelete }: { field: Field; onChange: (f: Field) => void; onDelete: () => void }) {
    return (
        <div className={`${reveal} space-y-2 rounded-xl border bg-card p-3`}>
            <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input value={field.label} onChange={e => onChange({ ...field, label: e.target.value })} placeholder="Асуултын нэр (ж: Таны нэр)" className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
                <button onClick={onDelete} className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-6">
                <select value={field.type} onChange={e => onChange({ ...field, type: e.target.value as FieldType })} className="rounded-lg border bg-background px-2 py-1.5 text-xs">
                    {(Object.keys(TYPE_LABEL) as FieldType[]).map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                </select>
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={field.required} onChange={e => onChange({ ...field, required: e.target.checked })} className="h-3.5 w-3.5 accent-[#1877F2]" /> Заавал</label>
                {field.type === 'select' && (
                    <input value={(field.options ?? []).join(', ')} onChange={e => onChange({ ...field, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Сонголтууд (таслалаар)" className="flex-1 rounded-lg border bg-background px-2 py-1.5 text-xs" />
                )}
            </div>
        </div>
    );
}

/* ─── Live preview (өвчтөнд харагдах байдал) ─────────────────────────────── */
function LivePreview({ name, description, fields, successMsg }: { name: string; description: string; fields: Field[]; successMsg: string }) {
    return (
        <div className="mx-auto w-full max-w-sm">
            <div className="mb-4 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Smartphone className="h-3.5 w-3.5" /> Хэрэглэгчид харагдах байдал
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_48px_-16px_rgba(0,0,0,0.14)]">
                <div className="h-[3px] w-full bg-gradient-to-r from-zinc-300 via-zinc-900 to-zinc-300" />
                <div className="relative overflow-hidden border-b border-zinc-100 bg-gradient-to-b from-zinc-50 to-white px-7 pb-6 pt-7">
                    <div className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-zinc-200/40 blur-2xl" />
                    <div className="relative">
                        <h1 className="text-[19px] font-semibold tracking-tight text-zinc-900">{name.trim() || 'Формын нэр'}</h1>
                        {description.trim() && <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{description}</p>}
                    </div>
                </div>
                <div className="space-y-5 px-7 py-7">
                    {fields.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Асуулт нэмнэ үү…</p>}
                    {fields.map((f, i) => (
                        <div key={i}>
                            <label className="mb-2 block text-[13px] font-medium text-zinc-700">{f.label.trim() || `Асуулт ${i + 1}`}{f.required && <span className="ml-0.5 text-amber-500">*</span>}</label>
                            {f.type === 'textarea' ? (
                                <div className="h-[74px] w-full rounded-xl border border-zinc-200 bg-white" />
                            ) : f.type === 'select' ? (
                                <div className="flex h-[42px] w-full items-center rounded-xl border border-zinc-200 bg-white px-3.5 text-[14px] text-zinc-300">Сонгох</div>
                            ) : (
                                <div className="h-[42px] w-full rounded-xl border border-zinc-200 bg-white" />
                            )}
                        </div>
                    ))}
                    <button type="button" className="relative mt-1 flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 px-4 py-3 text-[14px] font-semibold text-white shadow-lg shadow-zinc-900/25 ring-1 ring-zinc-900">
                        <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.14] to-transparent" />
                        <span className="relative">Илгээх</span>
                    </button>
                    {successMsg.trim() && (
                        <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-zinc-900" /> {successMsg}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Form editor ────────────────────────────────────────────────────────── */
function FormEditor({ form, admins, onBack }: { form: FormT | null; admins: Admin[]; onBack: () => void }) {
    const isNew = !form;
    const [tab, setTab] = useState<'build' | 'submissions'>('build');
    const [subs, setSubs] = useState<{ id: number; contact: string | null; data: Record<string, string>; submitted_at: string }[]>([]);
    const { data, setData, post, put, processing } = useForm<{ name: string; description: string; fields: Field[]; success_message: string; notify_emails: string[]; is_active: boolean }>({
        name: form?.name ?? '',
        description: form?.description ?? '',
        fields: form?.fields ?? [{ key: newKey(), label: 'Таны нэр', type: 'text', required: true, options: [] }],
        success_message: form?.success_message ?? 'Баярлалаа! Таны хүсэлтийг хүлээн авлаа. ✅',
        notify_emails: form?.notify_emails ?? [],
        is_active: form?.is_active ?? true,
    });

    function submit() {
        if (isNew) post('/admin/social/forms', { onSuccess: onBack });
        else put(`/admin/social/forms/${form!.id}`, { onSuccess: onBack });
    }
    function loadSubs() {
        if (!form) return;
        setTab('submissions');
        axios.get(`/admin/social/forms/${form.id}/submissions`).then(r => setSubs(r.data.submissions));
    }
    const setField = (i: number, f: Field) => setData('fields', data.fields.map((x, idx) => (idx === i ? f : x)));

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Sticky toolbar */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <button onClick={onBack} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-muted-foreground transition hover:bg-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /></button>
                    <div className="min-w-0">
                        <div className="truncate text-base font-bold leading-tight">{isNew ? 'Шинэ форм' : (data.name.trim() || 'Форм')}</div>
                        <div className="text-xs text-muted-foreground">{isNew ? 'Шинэ форм үүсгэх' : 'Формоо засаж байна'}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isNew && (
                        <div className="hidden gap-1 rounded-lg border p-0.5 text-sm sm:flex">
                            <button onClick={() => setTab('build')} className={`rounded-md px-3 py-1 transition ${tab === 'build' ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Засах</button>
                            <button onClick={loadSubs} className={`rounded-md px-3 py-1 transition ${tab === 'submissions' ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Хариултууд ({form?.submissions_count})</button>
                        </div>
                    )}
                    <button onClick={submit} disabled={processing || !data.name.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1877F2] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#166fe0] disabled:opacity-50"><Save className="h-4 w-4" /> Хадгалах</button>
                </div>
            </div>

            {tab === 'build' ? (
                <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(380px,480px)]">
                    {/* Зүүн: бүтээгч */}
                    <div className="overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
                        <div className="w-full space-y-6">
                            <section className="relative space-y-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-zinc-500/[0.06] blur-2xl" />
                                <div className="relative flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-white shadow-sm ring-1 ring-white/10"><FileText className="h-4 w-4" /></span>
                                    <div>
                                        <div className="text-sm font-semibold leading-tight">Үндсэн мэдээлэл</div>
                                        <div className="text-xs text-muted-foreground">Формын нэр ба тайлбар</div>
                                    </div>
                                </div>
                                <input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Формын нэр (ж: Захиалгын мэдээлэл)" className="w-full rounded-xl border bg-background px-4 py-3 text-base font-semibold outline-none transition focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20" />
                                <input value={data.description} onChange={e => setData('description', e.target.value)} placeholder="Тайлбар (заавал биш)" className={inputCls} />
                            </section>

                            <section className="relative space-y-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-500/[0.06] blur-2xl" />
                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-white shadow-sm ring-1 ring-white/10"><ListChecks className="h-4 w-4" /></span>
                                        <div>
                                            <div className="text-sm font-semibold leading-tight">Асуултууд</div>
                                            <div className="text-xs text-muted-foreground">Хэрэглэгчээс асуух талбарууд</div>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">{data.fields.length}</span>
                                </div>
                                {data.fields.map((f, i) => <FieldRow key={i} field={f} onChange={nf => setField(i, nf)} onDelete={() => setData('fields', data.fields.filter((_, idx) => idx !== i))} />)}
                                <button onClick={() => setData('fields', [...data.fields, { key: newKey(), label: '', type: 'text', required: true, options: [] }])} className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-2.5 text-sm font-medium transition hover:border-[#1877F2]/40 hover:bg-[#1877F2]/5 hover:text-[#1877F2]"><Plus className="h-4 w-4" /> Асуулт нэмэх</button>
                            </section>

                            <section className="relative space-y-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-zinc-500/[0.06] blur-2xl" />
                                <div className="relative flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-white shadow-sm ring-1 ring-white/10"><Settings2 className="h-4 w-4" /></span>
                                    <div>
                                        <div className="text-sm font-semibold leading-tight">Тохиргоо</div>
                                        <div className="text-xs text-muted-foreground">Мессеж ба төлөв</div>
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-1 text-sm font-medium">Амжилттай илгээсний мессеж</div>
                                    <input value={data.success_message} onChange={e => setData('success_message', e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><Bell className="h-3.5 w-3.5 text-amber-500" /> Мэдэгдэл очих админ</div>
                                    {admins.length === 0 ? (
                                        <p className="rounded-xl border border-dashed px-3 py-2.5 text-xs text-muted-foreground">Имэйлтэй админ олдсонгүй.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {admins.map(a => {
                                                const on = data.notify_emails.includes(a.email);
                                                return (
                                                    <button
                                                        key={a.id}
                                                        type="button"
                                                        onClick={() => setData('notify_emails', on ? data.notify_emails.filter(e => e !== a.email) : [...data.notify_emails, a.email])}
                                                        className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${on ? 'border-amber-400/60 bg-amber-50 dark:bg-amber-500/10' : 'hover:bg-muted'}`}
                                                    >
                                                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition ${on ? 'border-amber-500 bg-amber-500 text-white' : 'border-muted-foreground/30'}`}>{on && <Check className="h-3 w-3" />}</span>
                                                        <span className="min-w-0">
                                                            <span className="block truncate font-medium leading-tight">{a.name}</span>
                                                            <span className="block truncate text-xs text-muted-foreground">{a.email}</span>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <p className="mt-1.5 text-xs text-muted-foreground">Хүн хариу илгээх бүрд сонгосон админ(ууд)-ын имэйл рүү мэдэгдэл очино. Хоосон бол мэдэгдэл явуулахгүй.</p>
                                </div>
                                <label className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
                                    <span className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="h-4 w-4 accent-[#1877F2]" /> Идэвхтэй</span>
                                    <span className="text-xs text-muted-foreground">Идэвхгүй бол форм нээгдэхгүй</span>
                                </label>
                            </section>
                        </div>
                    </div>

                    {/* Баруун: амьд урьдчилан харах */}
                    <div className="hidden overflow-y-auto border-l bg-muted/30 px-6 py-8 lg:block">
                        <LivePreview name={data.name} description={data.description} fields={data.fields} successMsg={data.success_message} />
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                    <div className="mx-auto max-w-2xl space-y-2">
                        {subs.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"><Inbox className="mx-auto mb-2 h-7 w-7" /> Хариулт алга байна</div>}
                        {subs.map(s => (
                            <div key={s.id} className="rounded-xl border bg-card p-4">
                                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>{s.contact ?? 'Зочин'}</span><span>{s.submitted_at}</span></div>
                                <div className="space-y-1 text-sm">{Object.entries(s.data).map(([k, v]) => <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Forms({ forms, admins }: Props) {
    const [editing, setEditing] = useState<FormT | 'new' | null>(null);
    function del(f: FormT) { if (confirm(`"${f.name}" формыг устгах уу?`)) router.delete(`/admin/social/forms/${f.id}`); }

    if (editing) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Вэбформ" />
                <div className="font-warm flex min-h-0 flex-1 flex-col">
                    <FormEditor form={editing === 'new' ? null : editing} admins={admins} onBack={() => setEditing(null)} />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Вэбформ" />
            <div className="font-warm w-full p-4 sm:p-6">
                <div className="w-full space-y-6">
                    <div className={`${reveal} flex flex-wrap items-end justify-between gap-4`}>
                        <div className="flex items-center gap-3.5">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-white shadow-lg shadow-zinc-900/20 ring-1 ring-white/10"><ClipboardList className="h-6 w-6" /></span>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Вэбформ</h1>
                                <p className="mt-0.5 text-sm text-muted-foreground">Товч дарахад нээгдэх форм. Бөглөж илгээхэд хариу нь inbox-д ирнэ.</p>
                            </div>
                        </div>
                        <button onClick={() => setEditing('new')} className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/25 ring-1 ring-zinc-900 transition hover:shadow-xl hover:shadow-zinc-900/35 active:scale-[.98]">
                            <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.14] to-transparent" />
                            <Plus className="relative h-4 w-4" /> <span className="relative">Шинэ форм</span>
                        </button>
                    </div>

                    {forms.length === 0 ? (
                        <div className={`${reveal} flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-card p-14 text-center`}>
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-white shadow-lg ring-1 ring-white/10"><ClipboardList className="h-8 w-8" /></div>
                            <p className="text-base font-semibold">Форм алга байна</p>
                            <p className="-mt-1 text-sm text-muted-foreground">Эхний формоо үүсгэн товчинд холбоорой.</p>
                            <button onClick={() => setEditing('new')} className="relative mt-1 inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-zinc-900"><span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.14] to-transparent" /><Plus className="relative h-4 w-4" /> <span className="relative">Шинэ форм</span></button>
                        </div>
                    ) : (
                        <div className={`${reveal} overflow-hidden rounded-2xl border bg-card shadow-sm`}>
                            <div className="flex items-center gap-4 border-b bg-muted/40 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <span className="flex-1">Форм</span>
                                <span className="hidden w-24 text-center sm:block">Асуулт</span>
                                <span className="hidden w-24 text-center sm:block">Хариулт</span>
                                <span className="w-28 text-right">Үйлдэл</span>
                            </div>
                            <div className="divide-y">
                                {forms.map((f, i) => (
                                    <div key={f.id} className={`${reveal} group relative flex items-center gap-4 px-5 py-3.5 transition hover:bg-muted/40`} style={{ animationDelay: `${60 + i * 45}ms` }}>
                                        <span className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-gradient-to-b from-zinc-300 via-zinc-900 to-zinc-300 transition-transform duration-300 group-hover:scale-y-100" />

                                        <button onClick={() => setEditing(f)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-sm font-bold text-white shadow-sm ring-1 ring-white/10">{f.name.trim().charAt(0).toUpperCase() || '?'}</span>
                                            <span className="min-w-0">
                                                <span className="flex items-center gap-2">
                                                    <span className="truncate font-semibold">{f.name}</span>
                                                    {f.is_active
                                                        ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Идэвхтэй</span>
                                                        : <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Идэвхгүй</span>}
                                                </span>
                                                {f.description && <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">{f.description}</span>}
                                            </span>
                                        </button>

                                        <span className="hidden w-24 justify-center sm:flex">
                                            <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium"><ListChecks className="h-3.5 w-3.5 text-muted-foreground" /> {f.fields.length}</span>
                                        </span>
                                        <span className="hidden w-24 justify-center sm:flex">
                                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400"><Inbox className="h-3.5 w-3.5" /> {f.submissions_count}</span>
                                        </span>

                                        <div className="flex w-28 items-center justify-end gap-1">
                                            <a href={`/f/${f.id}`} target="_blank" rel="noreferrer" title="Формыг үзэх" className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"><Eye className="h-4 w-4" /></a>
                                            <button onClick={() => setEditing(f)} title="Засах" className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                                            <button onClick={() => del(f)} title="Устгах" className="rounded-lg p-2 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
