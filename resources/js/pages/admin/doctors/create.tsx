import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2, Upload, UserRound } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';

interface Branch { id: number; name: string }

interface Experience {
    year: string;
    title: string;
    institution: string;
    [key: string]: string;
}

interface Props { branches: Branch[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Эмч нар', href: '/admin/doctors' },
    { title: 'Шинэ эмч', href: '/admin/doctors/create' },
];

const emptyExp = (): Experience => ({ year: '', title: '', institution: '' });

export default function DoctorCreate({ branches }: Props) {
    const [preview, setPreview] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm<{
        branch_id: number | string;
        name: string;
        specialization: string;
        degree: string;
        experience_years: string;
        experiences: Experience[];
        description: string;
        phone: string;
        email: string;
        is_active: boolean;
        photo: File | null;
    }>({
        branch_id: branches[0]?.id ?? '',
        name: '',
        specialization: '',
        degree: '',
        experience_years: '0',
        experiences: [],
        description: '',
        phone: '',
        email: '',
        is_active: true,
        photo: null,
    });

    function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setData('photo', file);
        if (file) setPreview(URL.createObjectURL(file));
    }

    function addExp() {
        setData('experiences', [...data.experiences, emptyExp()]);
    }

    function updateExp(i: number, field: string, value: string) {
        const updated = [...data.experiences];
        updated[i] = { ...updated[i], [field]: value };
        setData('experiences', updated);
    }

    function removeExp(i: number) {
        setData('experiences', data.experiences.filter((_, idx) => idx !== i));
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/admin/doctors');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Шинэ эмч нэмэх" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/doctors" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-5" />
                    </Link>
                    <h1 className="text-xl font-bold">Шинэ эмч нэмэх</h1>
                </div>

                <form onSubmit={submit} encType="multipart/form-data" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Left */}
                        <div className="space-y-5 lg:col-span-2">
                            {/* Branch */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Салбар *</label>
                                {branches.length === 0 ? (
                                    <p className="text-sm text-yellow-600">
                                        Эхлээд <Link href="/admin/branches/create" className="underline">салбар нэмнэ үү</Link>
                                    </p>
                                ) : (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {branches.map((b) => (
                                            <button key={b.id} type="button" onClick={() => setData('branch_id', b.id)}
                                                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors ${Number(data.branch_id) === b.id ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' : 'hover:bg-muted'}`}>
                                                <span className={`size-2 rounded-full ${Number(data.branch_id) === b.id ? 'bg-red-500' : 'bg-muted-foreground/30'}`} />
                                                {b.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {errors.branch_id && <p className="text-xs text-red-500">{errors.branch_id}</p>}
                            </div>

                            {/* Name */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Эмчийн нэр *</label>
                                <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Жишээ: Доктор Сара Женинс" autoFocus
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>

                            {/* Specialization + Degree */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Мэргэжил / Чиглэл</label>
                                    <input type="text" value={data.specialization} onChange={(e) => setData('specialization', e.target.value)}
                                        placeholder="Жишээ: Мас засал эмч"
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Зэрэг / Цол</label>
                                    <input type="text" value={data.degree} onChange={(e) => setData('degree', e.target.value)}
                                        placeholder="Жишээ: Анагаах ухааны доктор"
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                </div>
                            </div>

                            {/* Experience years */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Нийт ажлын туршлага (жил)</label>
                                <input type="number" value={data.experience_years} onChange={(e) => setData('experience_years', e.target.value)}
                                    min="0" placeholder="0"
                                    className="border-input bg-background w-40 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Тайлбар</label>
                                <textarea value={data.description} onChange={(e) => setData('description', e.target.value)}
                                    rows={3} placeholder="Эмчийн тухай товч мэдээлэл..."
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                            </div>

                            {/* Phone + Email */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Утас</label>
                                    <input type="text" value={data.phone} onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="+976 9911 2233"
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">И-мэйл</label>
                                    <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)}
                                        placeholder="doctor@cuticul.mn"
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                </div>
                            </div>

                            {/* Active */}
                            <label className="flex cursor-pointer items-center gap-3">
                                <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} className="size-4 accent-red-600" />
                                <span className="text-sm font-medium">Идэвхтэй байдлаар бүртгэх</span>
                            </label>
                        </div>

                        {/* Right — Photo */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Зураг</label>
                            <div onClick={() => fileRef.current?.click()}
                                className="flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted transition-colors hover:border-red-500">
                                {preview ? (
                                    <img src={preview} alt="preview" className="h-full w-full object-cover object-top" />
                                ) : (
                                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                                        <div className="flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
                                            <UserRound className="size-8 text-blue-400" />
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-red-600">
                                            <Upload className="size-4" /> Зураг оруулах
                                        </div>
                                        <p className="text-muted-foreground text-xs">PNG, JPG — 5MB хүртэл</p>
                                    </div>
                                )}
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                            {preview && (
                                <button type="button" onClick={() => { setPreview(null); setData('photo', null); }} className="text-xs text-red-500 hover:underline">
                                    Зураг хасах
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Experiences */}
                    <div className="rounded-xl border">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <div>
                                <h2 className="font-semibold">Ажлын туршлага</h2>
                                <p className="text-muted-foreground mt-0.5 text-xs">Ажилласан байгууллага, хугацааг оруулна уу</p>
                            </div>
                            <button type="button" onClick={addExp}
                                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-700">
                                <Plus className="size-4" /> Нэмэх
                            </button>
                        </div>

                        {data.experiences.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10">
                                <p className="text-muted-foreground text-sm">Туршлага оруулаагүй байна</p>
                                <button type="button" onClick={addExp} className="text-sm text-red-600 hover:underline">
                                    + Туршлага нэмэх
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {data.experiences.map((exp, i) => (
                                    <div key={i} className="p-4">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">#{i + 1}</span>
                                            <button type="button" onClick={() => removeExp(i)}
                                                className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium">Он / Хугацаа</label>
                                                <input type="text" value={exp.year} onChange={(e) => updateExp(i, 'year', e.target.value)}
                                                    placeholder="2018 – 2022"
                                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium">Албан тушаал / Үйл ажиллагаа *</label>
                                                <input type="text" value={exp.title} onChange={(e) => updateExp(i, 'title', e.target.value)}
                                                    placeholder="Жишээ: Ахлах эмч"
                                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium">Байгууллага</label>
                                                <input type="text" value={exp.institution} onChange={(e) => updateExp(i, 'institution', e.target.value)}
                                                    placeholder="Жишээ: Улсын нэгдүгээр эмнэлэг"
                                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button type="submit" disabled={processing || branches.length === 0}
                            className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                            {processing ? 'Хадгалж байна...' : 'Хадгалах'}
                        </button>
                        <Link href="/admin/doctors" className="rounded-lg border px-6 py-2 text-sm font-medium hover:bg-muted">
                            Цуцлах
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
